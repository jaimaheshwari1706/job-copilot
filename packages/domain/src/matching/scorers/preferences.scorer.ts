import type { CandidateMatchInput, JobMatchInput, ScorerOutput, EvidenceItem } from "../types.js";

export function scorePreferences(candidate: CandidateMatchInput, job: JobMatchInput): ScorerOutput {
  const evidence: EvidenceItem[] = [];
  const signals: number[] = [];

  if (candidate.workMode && job.workMode) {
    let strength: number;
    if (candidate.workMode === job.workMode) strength = 1;
    else if (candidate.workMode === "hybrid" || job.workMode === "hybrid") strength = 0.6;
    else strength = 0; // direct remote-vs-onsite conflict
    signals.push(strength);
    evidence.push({
      type: "preference",
      requirement: `Work mode: ${job.workMode}`,
      status: strength >= 0.99 ? "matched" : strength > 0 ? "partial" : "missing",
      strength,
    });
  }

  if (candidate.preferredLocations.length > 0 && job.location) {
    const jobLocation = job.location.toLowerCase();
    const matched = candidate.preferredLocations.some(
      (loc) => jobLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocation),
    );
    signals.push(matched ? 1 : 0);
    evidence.push({
      type: "preference",
      requirement: `Location: ${job.location}`,
      status: matched ? "matched" : "missing",
      strength: matched ? 1 : 0,
    });
  }

  const candidateHasSalaryExpectation =
    candidate.expectedSalaryMin !== undefined || candidate.expectedSalaryMax !== undefined;
  const jobHasSalaryRange = job.salaryMin !== undefined || job.salaryMax !== undefined;
  if (candidateHasSalaryExpectation && jobHasSalaryRange) {
    const candMin = candidate.expectedSalaryMin ?? 0;
    const candMax = candidate.expectedSalaryMax ?? Infinity;
    const jobMin = job.salaryMin ?? 0;
    const jobMax = job.salaryMax ?? Infinity;
    const overlaps = Math.min(candMax, jobMax) >= Math.max(candMin, jobMin);
    signals.push(overlaps ? 1 : 0.3); // no overlap isn't automatically disqualifying — ranges are often negotiable
    evidence.push({
      type: "preference",
      requirement: "Salary range",
      status: overlaps ? "matched" : "partial",
      strength: overlaps ? 1 : 0.3,
    });
  }

  if (signals.length === 0) {
    return {
      score: 0.5,
      hasEvidence: false,
      evidence: [{ type: "preference", requirement: "Preferences", status: "no_evidence", strength: 0 }],
    };
  }

  const score = signals.reduce((sum, s) => sum + s, 0) / signals.length;
  return { score, hasEvidence: true, evidence };
}
