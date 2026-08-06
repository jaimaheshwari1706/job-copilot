import { Job, Profile } from "@job-copilot/db";
import { computeSkillGapAnalysis, type JobSkillProfile } from "@job-copilot/domain";
import type { SkillGapAnalysisResult } from "@job-copilot/shared";
import { toCandidateInput, getOrComputeMatch } from "../matches/matches.service.js";

/**
 * Jobs below this match score aren't a plausible fit regardless of skills,
 * so including them in demand stats would skew "what should I learn next"
 * toward roles the candidate probably doesn't want anyway. Same
 * relevance-via-matching pattern as Phase 7's recommendations, reused
 * rather than inventing a second definition of "relevant".
 */
const RELEVANCE_SCORE_THRESHOLD = 30;
const MAX_CANDIDATE_JOBS = 200;

export async function getSkillGapAnalysis(userId: string): Promise<SkillGapAnalysisResult> {
  const profile = await Profile.findOne({ userId });
  const candidateInput = toCandidateInput(profile ?? {});

  const activeJobs = await Job.find({ status: "active" }).limit(MAX_CANDIDATE_JOBS);

  // Parallelized rather than one-at-a-time — same fix and rationale as
  // dashboard.service.ts's computeJobMatchStats (measured ~2.8x slower
  // sequential on a cold cache even at demo scale). Pairs job+match
  // together per-item (matching the pattern jobs.service.ts already uses
  // for this same call) rather than a separate indexed lookup.
  const scored = await Promise.all(
    activeJobs.map(async (job) => ({ job, match: await getOrComputeMatch(userId, String(job._id)) })),
  );
  const relevantJobs: JobSkillProfile[] = scored
    .filter(({ match }) => match.overallScore >= RELEVANCE_SCORE_THRESHOLD)
    .map(({ job }) => ({
      requiredSkills: job.requiredSkills ?? [],
      preferredSkills: job.preferredSkills ?? [],
    }));

  return computeSkillGapAnalysis(candidateInput.skills, relevantJobs);
}
