export interface JobSkillProfile {
  requiredSkills: string[];
  preferredSkills: string[];
}

export interface SkillDemand {
  skill: string;
  demandCount: number;
  demandPercentage: number; // 0-100, rounded
  isRequired: boolean; // true if it appears as a required skill in at least one relevant job
  possessed: boolean;
}

export interface MissingSkillRecommendation extends SkillDemand {
  /** Jobs where this is the ONLY missing required skill — learning it alone would make the candidate fully match on required skills for these jobs. */
  jobsUnlocked: number;
}

export interface SkillGapAnalysisResult {
  totalRelevantJobs: number;
  existingSkills: string[]; // candidate's skills that actually show up in demand among relevant jobs
  skillDemand: SkillDemand[]; // every skill seen, sorted by demand desc
  topMissingSkills: MissingSkillRecommendation[]; // top 10, "best skills to learn next"
}

/**
 * Pure, deterministic — every number here is counted directly from the
 * `jobs` argument, never estimated or AI-generated (Phase 0 §21: "Do not
 * use AI guesses for demand percentages"). Callers are responsible for
 * deciding which jobs count as "relevant" before calling this.
 */
export function computeSkillGapAnalysis(
  candidateSkills: string[],
  jobs: JobSkillProfile[],
): SkillGapAnalysisResult {
  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const demandMap = new Map<string, { count: number; requiredCount: number }>();

  for (const job of jobs) {
    const allSkillsInJob = new Set([...job.requiredSkills, ...job.preferredSkills]);
    for (const skill of allSkillsInJob) {
      const entry = demandMap.get(skill) ?? { count: 0, requiredCount: 0 };
      entry.count++;
      if (job.requiredSkills.includes(skill)) entry.requiredCount++;
      demandMap.set(skill, entry);
    }
  }

  const totalRelevantJobs = jobs.length;

  const skillDemand: SkillDemand[] = [...demandMap.entries()]
    .map(([skill, { count, requiredCount }]) => ({
      skill,
      demandCount: count,
      demandPercentage: totalRelevantJobs > 0 ? Math.round((count / totalRelevantJobs) * 100) : 0,
      isRequired: requiredCount > 0,
      possessed: candidateSet.has(skill.toLowerCase()),
    }))
    .sort((a, b) => b.demandPercentage - a.demandPercentage || a.skill.localeCompare(b.skill));

  const existingSkills = skillDemand.filter((s) => s.possessed).map((s) => s.skill);

  const topMissingSkills: MissingSkillRecommendation[] = skillDemand
    .filter((s) => !s.possessed)
    .map((missingSkill) => {
      let jobsUnlocked = 0;
      for (const job of jobs) {
        const stillMissingForJob = job.requiredSkills.filter(
          (rs) => !candidateSet.has(rs.toLowerCase()),
        );
        if (
          stillMissingForJob.length === 1 &&
          stillMissingForJob[0]!.toLowerCase() === missingSkill.skill.toLowerCase()
        ) {
          jobsUnlocked++;
        }
      }
      return { ...missingSkill, jobsUnlocked };
    })
    .sort((a, b) => b.jobsUnlocked - a.jobsUnlocked || b.demandPercentage - a.demandPercentage)
    .slice(0, 10);

  return { totalRelevantJobs, existingSkills, skillDemand, topMissingSkills };
}
