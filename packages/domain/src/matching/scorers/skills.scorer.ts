import type { CandidateMatchInput, JobMatchInput, ScorerOutput, EvidenceItem } from "../types.js";

const REQUIRED_WEIGHT_WHEN_BOTH_PRESENT = 0.75;

export function scoreSkills(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  const candidateSet = new Set(candidate.skills.map((s) => s.toLowerCase()));
  const evidence: EvidenceItem[] = [];

  let requiredMatched = 0;
  for (const skill of job.requiredSkills) {
    const matched = candidateSet.has(skill.toLowerCase());
    if (matched) requiredMatched++;
    evidence.push({ type: "skill", requirement: skill, status: matched ? "matched" : "missing", strength: matched ? 1 : 0 });
  }

  let preferredMatched = 0;
  for (const skill of job.preferredSkills) {
    const matched = candidateSet.has(skill.toLowerCase());
    if (matched) preferredMatched++;
    evidence.push({
      type: "skill",
      requirement: skill,
      status: matched ? "matched" : "missing",
      strength: matched ? 0.5 : 0, // preferred-skill matches contribute less individual strength than required ones
    });
  }

  const hasEvidence = job.requiredSkills.length + job.preferredSkills.length > 0;
  if (!hasEvidence) {
    return { score: 0.5, hasEvidence: false, evidence: [{ type: "skill", requirement: "N/A", status: "no_evidence", strength: 0 }] };
  }

  const requiredScore = job.requiredSkills.length > 0 ? requiredMatched / job.requiredSkills.length : null;
  const preferredScore = job.preferredSkills.length > 0 ? preferredMatched / job.preferredSkills.length : null;

  let score: number;
  if (requiredScore !== null && preferredScore !== null) {
    score = requiredScore * REQUIRED_WEIGHT_WHEN_BOTH_PRESENT + preferredScore * (1 - REQUIRED_WEIGHT_WHEN_BOTH_PRESENT);
  } else {
    score = requiredScore ?? preferredScore ?? 0.5;
  }

  return { score, hasEvidence: true, evidence };
}
