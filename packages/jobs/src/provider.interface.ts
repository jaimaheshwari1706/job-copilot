export interface NormalizedJob {
  sourceJobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location?: string;
  country?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  employmentType?: "full_time" | "part_time" | "contract" | "internship";
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  skills?: string[];
  applyUrl: string;
  sourceUrl?: string;
  postedAt?: Date;
  expiresAt?: Date;
}

export interface ProviderSearchQuery {
  keywords?: string;
  limit?: number;
}

/**
 * Every job source (demo, or a real API) implements this same interface.
 * The ingestion pipeline only ever talks to JobProvider — it never knows
 * or cares which concrete provider produced the data. RawJob is
 * intentionally `unknown`-shaped since different providers structure their
 * payloads completely differently (Phase 0 §9, amendment #8).
 */
export interface JobProvider {
  readonly name: string;
  readonly schemaVersion: string;
  searchJobs(query: ProviderSearchQuery): Promise<unknown[]>;
  normalizeJob(raw: unknown): NormalizedJob;
}
