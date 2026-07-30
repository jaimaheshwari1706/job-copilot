import type { CandidateMatchInput, JobMatchInput, ScorerOutput, EvidenceItem } from "../types.js";

export function scoreProjects(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  if (candidate.projects.length === 0) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "project", requirement: "Relevant projects", status: "no_evidence", strength: 0 }],
    };
  }

  const jobSkillSet = new Set([...job.requiredSkills, ...job.preferredSkills].map((s) => s.toLowerCase()));
  const evidence: EvidenceItem[] = [];
  let matchedCount = 0;

  for (const project of candidate.projects) {
    const relevant = project.tech.some((t) => jobSkillSet.has(t.toLowerCase()));
    if (relevant) matchedCount++;
    evidence.push({
      type: "project",
      requirement: project.name,
      status: relevant ? "matched" : "missing",
      strength: relevant ? 1 : 0,
    });
  }

  return { score: matchedCount / candidate.projects.length, hasEvidence: true, evidence };
}
