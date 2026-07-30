import type { CandidateMatchInput, JobMatchInput, ScorerOutput } from "../types.js";

const DEGREE_KEYWORDS = ["degree", "bachelor", "master", "phd", "b.s.", "m.s.", "b.tech", "m.tech"];

export function scoreEducation(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  const jobMentionsDegree = job.requirements.some((req) =>
    DEGREE_KEYWORDS.some((keyword) => req.toLowerCase().includes(keyword)),
  );

  if (!jobMentionsDegree) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "education", requirement: "Not specified by job", status: "no_evidence", strength: 0 }],
    };
  }

  if (candidate.education.length === 0) {
    return {
      score: 0.3,
      hasEvidence: true,
      evidence: [{ type: "education", requirement: "Degree required", status: "missing", strength: 0 }],
    };
  }

  return {
    score: 1,
    hasEvidence: true,
    evidence: [{ type: "education", requirement: "Degree required", status: "matched", strength: 1 }],
  };
}
