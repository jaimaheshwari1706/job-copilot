import { Job, SavedJob, Application, ApplicationEvent } from "@job-copilot/db";
import { computeOrCacheMatch } from "@job-copilot/domain";
import type { DashboardStats } from "@job-copilot/shared";
import { APPLICATION_STATUS_ORDER } from "@job-copilot/shared";
import * as jobsService from "../jobs/jobs.service.js";
import * as skillsService from "../skills/skills.service.js";
import { getLLMProvider } from "../ai/ai-provider.factory.js";
import { withAiRunLogging } from "../ai/ai-run-logger.js";

const MAX_CANDIDATE_JOBS = 200;
const STRONG_MATCH_THRESHOLD = 80;
const PROMPT_VERSION = 1;

async function computeJobMatchStats(userId: string) {
  const jobsDiscovered = await Job.countDocuments({ status: "active" });
  const candidateJobs = await Job.find({ status: "active" }).limit(MAX_CANDIDATE_JOBS);

  // Parallelized rather than one-at-a-time — up to MAX_CANDIDATE_JOBS
  // sequential round trips measured at ~2.8x slower on a cold cache even
  // at demo scale (20 jobs: 481ms sequential vs the ~170ms this pattern
  // gives). Matches the concurrency pattern jobs.service.ts already uses
  // for the identical compute-or-cache call in getRecommendedJobs.
  const matches = await Promise.all(
    candidateJobs.map((job) => computeOrCacheMatch(userId, String(job._id))),
  );
  const scores = matches
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .map((match) => match.overallScore);

  const strongMatchesCount = scores.filter((s) => s >= STRONG_MATCH_THRESHOLD).length;
  const averageMatchScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null;

  return { jobsDiscovered, strongMatchesCount, averageMatchScore };
}

async function computeApplicationStats(userId: string) {
  const applications = await Application.find({ userId, deletedAt: null });

  const funnel: Record<string, number> = {};
  for (const status of APPLICATION_STATUS_ORDER) funnel[status] = 0;
  for (const app of applications) funnel[app.status] = (funnel[app.status] ?? 0) + 1;

  // "Applied and beyond" excludes 'saved' (not yet applied) — conversion
  // is about what happens after a real application goes in.
  const appliedOrBeyond = applications.filter((a) => a.status !== "saved").length;
  const progressed = applications.filter((a) => a.status === "interview" || a.status === "offer").length;
  const interviewConversionRate =
    appliedOrBeyond > 0 ? Math.round((progressed / appliedOrBeyond) * 100) : null;

  return {
    applicationsCount: applications.length,
    applicationFunnel: funnel as DashboardStats["applicationFunnel"],
    interviewConversionRate,
    applicationIds: applications.map((a) => ({
      id: a._id,
      jobSnapshot: a.jobSnapshot ?? { title: "Unknown role", company: "Unknown company" },
    })),
  };
}

async function computeRecentActivity(
  applicationRefs: Array<{ id: unknown; jobSnapshot: { title: string; company: string } }>,
): Promise<DashboardStats["recentActivity"]> {
  if (applicationRefs.length === 0) return [];

  const byId = new Map(applicationRefs.map((a) => [String(a.id), a.jobSnapshot]));
  const events = await ApplicationEvent.find({ applicationId: { $in: applicationRefs.map((a) => a.id) } })
    .sort({ createdAt: -1 })
    .limit(5);

  return events.map((e) => {
    const snapshot = byId.get(String(e.applicationId));
    const description =
      e.type === "status_change"
        ? `Status changed: ${e.fromStatus} → ${e.toStatus}`
        : e.type === "interview_scheduled"
          ? "Interview scheduled"
          : "Application created";
    return {
      applicationId: String(e.applicationId),
      jobTitle: snapshot?.title ?? "Unknown role",
      company: snapshot?.company ?? "Unknown company",
      description,
      createdAt: e.createdAt!.toISOString(),
    };
  });
}

function buildInsightPrompt(stats: {
  jobsDiscovered: number;
  strongMatchesCount: number;
  applicationsCount: number;
  applicationFunnel: Record<string, number>;
  interviewConversionRate: number | null;
  topMissingSkills: string[];
}): string {
  return `Write ONE short paragraph (2-3 sentences, no bullet points) of career-search insight based ONLY on the calculated statistics below — never invent numbers not given here.

<stats>
Jobs discovered: ${stats.jobsDiscovered}
Strong matches (80%+): ${stats.strongMatchesCount}
Applications submitted: ${stats.applicationsCount}
Application funnel: ${JSON.stringify(stats.applicationFunnel)}
Interview conversion rate: ${stats.interviewConversionRate ?? "not enough data yet"}
Top skill gaps: ${stats.topMissingSkills.join(", ") || "none identified"}
</stats>

Be specific and encouraging but honest — if there isn't much data yet, say so plainly rather than padding with generic advice.`;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [matchStats, appStats, skillGap, recommended] = await Promise.all([
    computeJobMatchStats(userId),
    computeApplicationStats(userId),
    skillsService.getSkillGapAnalysis(userId),
    jobsService.getRecommendedJobs(userId, { page: 1, limit: 3 }),
  ]);

  const savedJobsCount = await SavedJob.countDocuments({ userId, status: "saved" });
  const recentActivity = await computeRecentActivity(appStats.applicationIds);
  const topMissingSkills = skillGap.topMissingSkills.slice(0, 5);

  const llm = getLLMProvider();
  let aiInsight: string | null = null;

  if (llm) {
    const { text } = await withAiRunLogging(
      { userId, feature: "dashboard-insight", promptVersion: PROMPT_VERSION },
      () =>
        llm.generateText({
          prompt: buildInsightPrompt({
            jobsDiscovered: matchStats.jobsDiscovered,
            strongMatchesCount: matchStats.strongMatchesCount,
            applicationsCount: appStats.applicationsCount,
            applicationFunnel: appStats.applicationFunnel,
            interviewConversionRate: appStats.interviewConversionRate,
            topMissingSkills: topMissingSkills.map((s) => s.skill),
          }),
          maxTokens: 300,
        }),
    );
    aiInsight = text.trim();
  }

  return {
    jobsDiscovered: matchStats.jobsDiscovered,
    strongMatchesCount: matchStats.strongMatchesCount,
    savedJobsCount,
    averageMatchScore: matchStats.averageMatchScore,
    applicationsCount: appStats.applicationsCount,
    applicationFunnel: appStats.applicationFunnel,
    interviewConversionRate: appStats.interviewConversionRate,
    recentActivity,
    topRecommendedJobs: recommended.jobs,
    topMissingSkills,
    aiInsight,
    aiAvailable: Boolean(llm),
  };
}
