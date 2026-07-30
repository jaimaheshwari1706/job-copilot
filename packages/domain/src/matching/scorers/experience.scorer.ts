import type { CandidateMatchInput, JobMatchInput, ScorerOutput } from "../types.js";

export function scoreExperience(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  const jobRequirementLabel = `${job.experienceMin ?? 0}${job.experienceMax !== undefined ? `-${job.experienceMax}` : "+"} years`;

  if (job.experienceMin === undefined && job.experienceMax === undefined) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "experience", requirement: "Not specified by job", status: "no_evidence", strength: 0 }],
    };
  }

  if (candidate.experienceYears === undefined) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "experience", requirement: jobRequirementLabel, status: "no_evidence", strength: 0 }],
    };
  }

  const min = job.experienceMin ?? 0;
  const max = job.experienceMax ?? Infinity;
  const years = candidate.experienceYears;

  let score: number;
  let status: "matched" | "partial" | "missing";

  if (years >= min && years <= max) {
    score = 1;
    status = "matched";
  } else if (years < min) {
    const gap = min - years;
    // Proportional falloff — a 1-year gap on a 2-year-minimum role hurts far
    // more than a 1-year gap on a 10-year-minimum role.
    score = Math.max(0, 1 - gap / Math.max(min, 1));
    status = gap >= 3 ? "missing" : "partial";
  } else {
    const over = years - max;
    // Overqualification is a much softer signal than underqualification —
    // floor at 0.5 rather than letting it collapse toward 0.
    score = Math.max(0.5, 1 - over / 10);
    status = "partial";
  }

  return {
    score,
    hasEvidence: true,
    evidence: [{ type: "experience", requirement: jobRequirementLabel, status, strength: score }],
  };
}
