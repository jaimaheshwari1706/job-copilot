import { scoreSkills } from "./scorers/skills.scorer.js";
import { scoreExperience } from "./scorers/experience.scorer.js";
import { scoreRole } from "./scorers/role.scorer.js";
import { scorePreferences } from "./scorers/preferences.scorer.js";
import { scoreProjects } from "./scorers/projects.scorer.js";
import { scoreEducation } from "./scorers/education.scorer.js";
import { computeConstraintPenalties } from "./constraints.js";
import { computeConfidence } from "./confidence.js";
import { MATCH_WEIGHTS, SCORING_VERSION } from "./weights.config.js";
import type { CandidateMatchInput, JobMatchInput, MatchResult } from "./types.js";

export function runMatchPipeline(candidate: CandidateMatchInput, job: JobMatchInput): MatchResult {
  const skills = scoreSkills(candidate, job);
  const experience = scoreExperience(candidate, job);
  const role = scoreRole(candidate, job);
  const preferences = scorePreferences(candidate, job);
  const projects = scoreProjects(candidate, job);
  const education = scoreEducation(candidate, job);

  const weightedScore =
    skills.score * MATCH_WEIGHTS.skills +
    experience.score * MATCH_WEIGHTS.experience +
    projects.score * MATCH_WEIGHTS.projects +
    role.score * MATCH_WEIGHTS.role +
    education.score * MATCH_WEIGHTS.education +
    preferences.score * MATCH_WEIGHTS.preferences;

  const penalties = computeConstraintPenalties(candidate, job);
  const penaltyTotal = penalties.reduce((sum, p) => sum + p.amount, 0);

  const overallScore = Math.max(0, Math.min(100, Math.round(weightedScore * 100 - penaltyTotal)));

  const confidence = computeConfidence({ skills, experience, role, preferences, projects, education });

  const candidateSkillSet = new Set(candidate.skills.map((s) => s.toLowerCase()));
  const allJobSkills = [...job.requiredSkills, ...job.preferredSkills];
  const matchedSkills = [...new Set(allJobSkills.filter((s) => candidateSkillSet.has(s.toLowerCase())))];
  const missingRequiredSkills = job.requiredSkills.filter((s) => !candidateSkillSet.has(s.toLowerCase()));
  const missingPreferredSkills = job.preferredSkills.filter((s) => !candidateSkillSet.has(s.toLowerCase()));

  return {
    overallScore,
    confidence,
    breakdown: {
      skills: Math.round(skills.score * 100),
      experience: Math.round(experience.score * 100),
      projects: Math.round(projects.score * 100),
      role: Math.round(role.score * 100),
      education: Math.round(education.score * 100),
      preferences: Math.round(preferences.score * 100),
    },
    matchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    evidence: [
      ...skills.evidence,
      ...experience.evidence,
      ...role.evidence,
      ...preferences.evidence,
      ...projects.evidence,
      ...education.evidence,
    ],
    penalties,
    scoringVersion: SCORING_VERSION,
  };
}
