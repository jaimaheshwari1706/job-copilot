import { z } from "zod";

export const workModeFilterSchema = z.enum(["remote", "hybrid", "onsite"]);
export const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "internship"]);

export const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  normalizedTitle: z.string(),
  company: z.string(),
  companyLogo: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  workMode: workModeFilterSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  experienceMin: z.number().optional(),
  experienceMax: z.number().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  description: z.string(),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  preferredQualifications: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  postedAt: z.string().nullable(),
  applyUrl: z.string().optional(), // resolved from the job's primary listing
  savedStatus: z.enum(["saved", "hidden"]).nullable().optional(), // present when requested by an authenticated user
});
export type Job = z.infer<typeof jobSchema>;

export const jobSearchQuerySchema = z.object({
  keywords: z.string().trim().optional(),
  location: z.string().trim().optional(),
  workMode: workModeFilterSchema.optional(),
  experienceMin: z.coerce.number().min(0).optional(),
  skills: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobSearchQuery = z.infer<typeof jobSearchQuerySchema>;

export const jobSearchResultSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type JobSearchResult = z.infer<typeof jobSearchResultSchema>;

export const recommendedJobsQuerySchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  workMode: workModeFilterSchema.optional(),
  recentDays: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type RecommendedJobsQuery = z.infer<typeof recommendedJobsQuerySchema>;

/** Typed BullMQ contract for the job-ingestion queue. */
export const jobIngestionJobSchema = z.object({
  provider: z.string(),
  keywords: z.string().optional(),
});
export type JobIngestionJob = z.infer<typeof jobIngestionJobSchema>;

export const jobIngestionResultSchema = z.object({
  provider: z.string(),
  fetchedCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  duplicateCount: z.number(),
  failedCount: z.number(),
});
export type JobIngestionResult = z.infer<typeof jobIngestionResultSchema>;
