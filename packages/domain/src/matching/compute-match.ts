import { Job, Profile, JobMatch, type JobMatchDoc } from "@job-copilot/db";
import type { HydratedDocument } from "mongoose";
import { runMatchPipeline } from "./match.pipeline.js";
import { SCORING_VERSION } from "./weights.config.js";
import type { CandidateMatchInput, JobMatchInput } from "./types.js";

export function toCandidateInput(profile: {
  skills?: { name: string; confirmed: boolean }[];
  experienceYears?: number | null;
  currentRole?: string | null;
  targetRoles?: string[];
  workMode?: string | null;
  preferredLocations?: string[];
  expectedSalary?: { min?: number | null; max?: number | null } | null;
  projects?: { name: string; tech?: string[] }[];
  education?: { degree?: string | null; field?: string | null }[];
}): CandidateMatchInput {
  return {
    // Only confirmed skills count as matching evidence — unconfirmed
    // AI-extracted skills (Phase 8+) shouldn't silently inflate a score.
    skills: (profile.skills ?? []).filter((s) => s.confirmed).map((s) => s.name),
    experienceYears: profile.experienceYears ?? undefined,
    currentRole: profile.currentRole ?? undefined,
    targetRoles: profile.targetRoles ?? [],
    workMode: profile.workMode as CandidateMatchInput["workMode"],
    preferredLocations: profile.preferredLocations ?? [],
    expectedSalaryMin: profile.expectedSalary?.min ?? undefined,
    expectedSalaryMax: profile.expectedSalary?.max ?? undefined,
    projects: (profile.projects ?? []).map((p) => ({ name: p.name, tech: p.tech ?? [] })),
    education: (profile.education ?? []).map((e) => ({
      degree: e.degree ?? undefined,
      field: e.field ?? undefined,
    })),
  };
}

export function toJobInput(job: {
  title: string;
  normalizedTitle: string;
  location?: string | null;
  workMode?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
  requirements?: string[];
}): JobMatchInput {
  return {
    title: job.title,
    normalizedTitle: job.normalizedTitle,
    location: job.location ?? undefined,
    workMode: job.workMode as JobMatchInput["workMode"],
    experienceMin: job.experienceMin ?? undefined,
    experienceMax: job.experienceMax ?? undefined,
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    requiredSkills: job.requiredSkills ?? [],
    preferredSkills: job.preferredSkills ?? [],
    requirements: job.requirements ?? [],
  };
}

/**
 * Returns a cached JobMatch document if one exists at the current
 * SCORING_VERSION, otherwise computes and persists a fresh one. A
 * stale-version match is never trusted (Phase 0 §11). Shared by apps/api
 * (on-demand match requests, recommendations, skill-gap analysis) and
 * apps/worker (alert filtering, daily brief ranking) — moved here rather
 * than living in apps/api so the worker doesn't need to import from api.
 */
export async function computeOrCacheMatch(
  userId: string,
  jobId: string,
): Promise<HydratedDocument<JobMatchDoc> | null> {
  const cached = await JobMatch.findOne({ userId, jobId, scoringVersion: SCORING_VERSION });
  if (cached) return cached;

  const [job, profile] = await Promise.all([
    Job.findOne({ _id: jobId, status: "active" }),
    Profile.findOne({ userId }),
  ]);
  if (!job) return null;

  const candidateInput = toCandidateInput(profile ?? {});
  const jobInput = toJobInput(job);
  const result = runMatchPipeline(candidateInput, jobInput);

  return JobMatch.findOneAndUpdate(
    { userId, jobId },
    {
      $set: {
        overallScore: result.overallScore,
        confidence: result.confidence,
        breakdown: result.breakdown,
        matchedSkills: result.matchedSkills,
        missingRequiredSkills: result.missingRequiredSkills,
        missingPreferredSkills: result.missingPreferredSkills,
        evidence: result.evidence,
        penalties: result.penalties,
        scoringVersion: result.scoringVersion,
        computedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}
