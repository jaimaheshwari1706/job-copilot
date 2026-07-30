export interface CandidateMatchInput {
  skills: string[]; // normalized, confirmed candidate skills only
  experienceYears?: number;
  currentRole?: string;
  targetRoles: string[];
  workMode?: "remote" | "hybrid" | "onsite";
  preferredLocations: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  // Realistically empty for most candidates right now — structured resume
  // extraction (projects/education) doesn't exist until Phase 8. Scorers
  // must handle this as "no evidence", not as a zero/failing score.
  projects: Array<{ name: string; tech: string[] }>;
  education: Array<{ degree?: string; field?: string }>;
}

export interface JobMatchInput {
  title: string;
  normalizedTitle: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: string[]; // raw text, used only for the education keyword scan
}

export type EvidenceType = "skill" | "experience" | "role" | "project" | "education" | "preference";
export type EvidenceStatus = "matched" | "missing" | "partial" | "no_evidence";

export interface EvidenceItem {
  type: EvidenceType;
  requirement: string;
  status: EvidenceStatus;
  strength: number; // 0..1
}

export interface ScorerOutput {
  score: number; // 0..1
  hasEvidence: boolean;
  evidence: EvidenceItem[];
}

export interface PenaltyItem {
  reason: string;
  amount: number; // points subtracted from the final 0..100 score
}

export interface MatchBreakdown {
  skills: number;
  experience: number;
  projects: number;
  role: number;
  education: number;
  preferences: number;
}

export interface MatchResult {
  overallScore: number; // 0..100
  confidence: number; // 0..1
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  evidence: EvidenceItem[];
  penalties: PenaltyItem[];
  scoringVersion: number;
}
