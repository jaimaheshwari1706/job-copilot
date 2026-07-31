export interface AlertableJob {
  title: string;
  skills: string[];
  location?: string;
  workMode?: string;
  experienceMin?: number;
  salaryMax?: number;
}

export interface AlertCriteriaInput {
  keywords?: string;
  skills?: string[];
  location?: string;
  workMode?: string;
  experienceMin?: number;
  salaryMin?: number;
}

/**
 * Pure predicate — no DB, no match score (that requires a candidate
 * profile and runs through the matching pipeline separately, applied by
 * the caller via minMatchScore). Every criterion that IS set must pass;
 * unset criteria are ignored rather than treated as a mismatch.
 */
export function jobMatchesAlertCriteria(job: AlertableJob, criteria: AlertCriteriaInput): boolean {
  if (criteria.keywords) {
    const keyword = criteria.keywords.toLowerCase();
    const titleMatches = job.title.toLowerCase().includes(keyword);
    const skillMatches = job.skills.some((s) => s.toLowerCase().includes(keyword));
    if (!titleMatches && !skillMatches) return false;
  }

  if (criteria.skills && criteria.skills.length > 0) {
    const jobSkillsLower = new Set(job.skills.map((s) => s.toLowerCase()));
    const hasAnyRequestedSkill = criteria.skills.some((s) => jobSkillsLower.has(s.toLowerCase()));
    if (!hasAnyRequestedSkill) return false;
  }

  if (criteria.location) {
    if (!job.location || !job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
      return false;
    }
  }

  if (criteria.workMode && job.workMode !== criteria.workMode) return false;

  if (criteria.experienceMin !== undefined && job.experienceMin !== undefined) {
    // Same semantics as job search (§9): a job qualifies if its stated
    // minimum requirement is at or below the candidate's experience.
    if (job.experienceMin > criteria.experienceMin) return false;
  }

  if (criteria.salaryMin !== undefined && job.salaryMax !== undefined) {
    if (job.salaryMax < criteria.salaryMin) return false;
  }

  return true;
}
