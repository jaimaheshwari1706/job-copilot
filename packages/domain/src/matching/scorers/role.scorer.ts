import type { CandidateMatchInput, JobMatchInput, ScorerOutput } from "../types.js";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function scoreRole(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  const candidateRoles = [candidate.currentRole, ...candidate.targetRoles].filter(
    (r): r is string => Boolean(r),
  );

  if (candidateRoles.length === 0) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "role", requirement: job.title, status: "no_evidence", strength: 0 }],
    };
  }

  const jobTokens = tokenize(job.normalizedTitle);
  let bestSimilarity = 0;
  for (const role of candidateRoles) {
    const similarity = jaccardSimilarity(tokenize(role), jobTokens);
    if (similarity > bestSimilarity) bestSimilarity = similarity;
  }

  const status = bestSimilarity >= 0.5 ? "matched" : bestSimilarity > 0 ? "partial" : "missing";

  return {
    score: bestSimilarity,
    hasEvidence: true,
    evidence: [{ type: "role", requirement: job.title, status, strength: bestSimilarity }],
  };
}
