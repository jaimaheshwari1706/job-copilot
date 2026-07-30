import type { HydratedDocument } from "mongoose";
import { Job, JobListing, SavedJob, IngestionRun, type JobDoc } from "@job-copilot/db";
import { createJobIngestionQueue } from "@job-copilot/queue";
import type {
  Job as JobDto,
  JobSearchQuery,
  JobSearchResult,
  RecommendedJobsQuery,
} from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { getOrComputeMatch } from "../matches/matches.service.js";

async function resolveApplyUrl(jobId: unknown): Promise<string | undefined> {
  const listing = await JobListing.findOne({ jobId }).sort({ lastSeenAt: -1 });
  return listing?.applyUrl;
}

async function resolveSavedStatus(
  userId: string | undefined,
  jobId: unknown,
): Promise<"saved" | "hidden" | null> {
  if (!userId) return null;
  const saved = await SavedJob.findOne({ userId, jobId });
  return (saved?.status as "saved" | "hidden" | undefined) ?? null;
}

async function toJobDto(job: HydratedDocument<JobDoc>, userId?: string): Promise<JobDto> {
  const [applyUrl, savedStatus] = await Promise.all([
    resolveApplyUrl(job._id),
    resolveSavedStatus(userId, job._id),
  ]);

  return {
    id: String(job._id),
    title: job.title,
    normalizedTitle: job.normalizedTitle,
    company: job.company,
    companyLogo: job.companyLogo ?? undefined,
    location: job.location ?? undefined,
    country: job.country ?? undefined,
    workMode: job.workMode as JobDto["workMode"],
    employmentType: job.employmentType as JobDto["employmentType"],
    experienceMin: job.experienceMin ?? undefined,
    experienceMax: job.experienceMax ?? undefined,
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    salaryCurrency: job.salaryCurrency ?? undefined,
    description: job.description,
    responsibilities: job.responsibilities ?? [],
    requirements: job.requirements ?? [],
    preferredQualifications: job.preferredQualifications ?? [],
    skills: job.skills ?? [],
    postedAt: job.postedAt ? job.postedAt.toISOString() : null,
    applyUrl,
    savedStatus,
  };
}

export async function searchJobs(query: JobSearchQuery, userId?: string): Promise<JobSearchResult> {
  const filter: Record<string, unknown> = { status: "active" };

  if (query.keywords) {
    filter.$text = { $search: query.keywords };
  }
  if (query.location) {
    filter.location = { $regex: query.location, $options: "i" };
  }
  if (query.workMode) {
    filter.workMode = query.workMode;
  }
  if (query.skills && query.skills.length > 0) {
    filter.skills = { $in: query.skills };
  }
  if (query.experienceMin !== undefined) {
    // Jobs whose minimum requirement is at or below the candidate's stated
    // experience — i.e. jobs they'd qualify for, not jobs requiring exactly
    // that many years.
    filter.experienceMin = { $lte: query.experienceMin };
  }

  // Hidden jobs are excluded from general search results for the requesting user.
  if (userId) {
    const hidden = await SavedJob.find({ userId, status: "hidden" }).select("jobId");
    if (hidden.length > 0) {
      filter._id = { $nin: hidden.map((h) => h.jobId) };
    }
  }

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    Job.find(filter).sort({ postedAt: -1 }).skip(skip).limit(query.limit),
    Job.countDocuments(filter),
  ]);

  const jobs = await Promise.all(docs.map((doc) => toJobDto(doc, userId)));
  return { jobs, total, page: query.page, limit: query.limit };
}

export async function getJobById(jobId: string, userId?: string): Promise<JobDto> {
  const job = await Job.findOne({ _id: jobId, status: "active" });
  if (!job) throw ApiError.notFound("Job not found");
  return toJobDto(job, userId);
}

export async function setSavedStatus(
  userId: string,
  jobId: string,
  status: "saved" | "hidden",
): Promise<void> {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");

  await SavedJob.findOneAndUpdate(
    { userId, jobId },
    { $set: { status } },
    { upsert: true, new: true },
  );
}

export async function clearSavedStatus(userId: string, jobId: string): Promise<void> {
  await SavedJob.deleteOne({ userId, jobId });
}

export async function listSavedJobs(
  userId: string,
  status: "saved" | "hidden" = "saved",
): Promise<JobDto[]> {
  const savedEntries = await SavedJob.find({ userId, status }).sort({ createdAt: -1 });
  const jobs = await Job.find({ _id: { $in: savedEntries.map((s) => s.jobId) }, status: "active" });
  // Preserve save-order rather than the $in query's arbitrary order.
  const byId = new Map(jobs.map((j) => [String(j._id), j]));
  const ordered = savedEntries.map((s) => byId.get(String(s.jobId))).filter(Boolean) as HydratedDocument<JobDoc>[];
  return Promise.all(ordered.map((job) => toJobDto(job, userId)));
}

/**
 * Ranks jobs by match score (Phase 6), with recency as a tiebreaker and
 * hidden jobs excluded — the three ranking factors from Phase 0 §13 that
 * aren't already baked into the match score itself (preferences and skill
 * fit are scored by the matching pipeline; this layer only ranks/filters).
 *
 * Scale note: this computes-or-fetches-cached a match for every active job
 * on each request, capped at MAX_CANDIDATE_JOBS. That's the right tradeoff
 * at this project's scale (reuses Phase 6's cache, no new infrastructure)
 * but would need to move to a background-precomputed batch (the "matching"
 * queue Phase 0 lists) at real job-board volume — noted here rather than
 * silently degrading under load.
 */
const MAX_CANDIDATE_JOBS = 200;

export async function getRecommendedJobs(
  userId: string,
  query: RecommendedJobsQuery,
): Promise<JobSearchResult> {
  const filter: Record<string, unknown> = { status: "active" };
  if (query.workMode) filter.workMode = query.workMode;
  if (query.recentDays !== undefined) {
    filter.postedAt = { $gte: new Date(Date.now() - query.recentDays * 24 * 60 * 60 * 1000) };
  }

  const hidden = await SavedJob.find({ userId, status: "hidden" }).select("jobId");
  if (hidden.length > 0) {
    filter._id = { $nin: hidden.map((h) => h.jobId) };
  }

  const candidateJobs = await Job.find(filter).sort({ postedAt: -1 }).limit(MAX_CANDIDATE_JOBS);

  const scored = await Promise.all(
    candidateJobs.map(async (job) => ({
      job,
      match: await getOrComputeMatch(userId, String(job._id)),
    })),
  );

  const filtered =
    query.minScore !== undefined
      ? scored.filter(({ match }) => match.overallScore >= query.minScore!)
      : scored;

  filtered.sort((a, b) => {
    if (b.match.overallScore !== a.match.overallScore) {
      return b.match.overallScore - a.match.overallScore;
    }
    const aTime = a.job.postedAt?.getTime() ?? 0;
    const bTime = b.job.postedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const page = filtered.slice(start, start + query.limit);

  const jobs = await Promise.all(page.map(({ job }) => toJobDto(job, userId)));
  return { jobs, total, page: query.page, limit: query.limit };
}

/** Admin-only: manually enqueues an ingestion run rather than waiting for the hourly schedule. */
export async function triggerIngestion(provider: string): Promise<{ enqueued: true }> {
  const queue = createJobIngestionQueue(env.REDIS_URL);
  await queue.add("manual-ingestion", { provider });
  return { enqueued: true };
}

export async function listIngestionRuns(limit = 20) {
  return IngestionRun.find().sort({ startedAt: -1 }).limit(limit);
}
