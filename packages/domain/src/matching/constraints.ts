import type { CandidateMatchInput, JobMatchInput, PenaltyItem } from "./types.js";

const SEVERE_EXPERIENCE_GAP_YEARS = 3;
const MAX_EXPERIENCE_PENALTY = 35;
const ZERO_REQUIRED_SKILLS_PENALTY = 20;

/**
 * Not every mismatch hard-rejects a job — most flow through the weighted
 * scorers above. Only the two scenarios Phase 0 explicitly calls out as
 * needing to survive averaging get an explicit penalty here: a severe
 * experience gap, and matching zero required skills.
 */
export function computeConstraintPenalties(
  candidate: CandidateMatchInput,
  job: JobMatchInput,
): PenaltyItem[] {
  const penalties: PenaltyItem[] = [];

  if (job.experienceMin !== undefined && candidate.experienceYears !== undefined) {
    const gap = job.experienceMin - candidate.experienceYears;
    if (gap >= SEVERE_EXPERIENCE_GAP_YEARS) {
      penalties.push({
        reason: `Role requires ${job.experienceMin}+ years; candidate has ${candidate.experienceYears}`,
        amount: Math.min(MAX_EXPERIENCE_PENALTY, gap * 6),
      });
    }
  }

  if (job.requiredSkills.length > 0) {
    const candidateSkillSet = new Set(candidate.skills.map((s) => s.toLowerCase()));
    const matchedCount = job.requiredSkills.filter((s) => candidateSkillSet.has(s.toLowerCase())).length;
    if (matchedCount === 0) {
      penalties.push({ reason: "No required skills matched", amount: ZERO_REQUIRED_SKILLS_PENALTY });
    }
  }

  return penalties;
}
