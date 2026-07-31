import { z } from "zod";
import { jobSchema } from "./job.js";
import { missingSkillRecommendationSchema } from "./skill-gap.js";
import { applicationStatusSchema } from "./application.js";

export const applicationFunnelSchema = z.record(applicationStatusSchema, z.number());

export const recentActivityItemSchema = z.object({
  applicationId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  description: z.string(), // e.g. "Status changed: applied -> interview"
  createdAt: z.string(),
});

export const dashboardStatsSchema = z.object({
  jobsDiscovered: z.number(),
  strongMatchesCount: z.number(),
  savedJobsCount: z.number(),
  averageMatchScore: z.number().nullable(), // null when no matches have been computed yet
  applicationsCount: z.number(),
  applicationFunnel: applicationFunnelSchema,
  interviewConversionRate: z.number().nullable(), // (interview+offer) / (applied and beyond), null if no applications
  recentActivity: z.array(recentActivityItemSchema),
  topRecommendedJobs: z.array(jobSchema),
  topMissingSkills: z.array(missingSkillRecommendationSchema),
  aiInsight: z.string().nullable(),
  aiAvailable: z.boolean(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
