import type { JobMatchDoc } from "@job-copilot/db";
import { computeOrCacheMatch, toCandidateInput } from "@job-copilot/domain";
import type { Match as MatchDto } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";

// Re-exported so existing call sites (jd-analyzer, interview, skills
// services) don't all need updating — the real implementation now lives
// in packages/domain so apps/worker can use it too, without importing
// from apps/api (Phase 0's dependency-direction rule).
export { toCandidateInput };

function toMatchDto(match: JobMatchDoc): MatchDto {
  return {
    jobId: String(match.jobId),
    overallScore: match.overallScore,
    confidence: match.confidence,
    breakdown: match.breakdown!,
    matchedSkills: match.matchedSkills ?? [],
    missingRequiredSkills: match.missingRequiredSkills ?? [],
    missingPreferredSkills: match.missingPreferredSkills ?? [],
    evidence: (match.evidence ?? []) as MatchDto["evidence"],
    penalties: (match.penalties ?? []) as MatchDto["penalties"],
    scoringVersion: match.scoringVersion,
    computedAt: match.computedAt ? match.computedAt.toISOString() : new Date().toISOString(),
  };
}

export async function getOrComputeMatch(userId: string, jobId: string): Promise<MatchDto> {
  const match = await computeOrCacheMatch(userId, jobId);
  if (!match) throw ApiError.notFound("Job not found");
  return toMatchDto(match);
}
