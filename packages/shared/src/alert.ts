import { z } from "zod";
import { workModeFilterSchema } from "./job.js";

export const alertCriteriaSchema = z.object({
  keywords: z.string().trim().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().trim().optional(),
  workMode: workModeFilterSchema.optional(),
  experienceMin: z.coerce.number().min(0).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  minMatchScore: z.coerce.number().min(0).max(100).optional(),
});
export type AlertCriteria = z.infer<typeof alertCriteriaSchema>;

export const alertFrequencySchema = z.enum(["daily", "weekly"]);

export const createJobAlertSchema = z.object({
  name: z.string().trim().min(1).max(120),
  criteria: alertCriteriaSchema,
  frequency: alertFrequencySchema.default("daily"),
});
export type CreateJobAlertInput = z.infer<typeof createJobAlertSchema>;

export const updateJobAlertSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  criteria: alertCriteriaSchema.optional(),
  frequency: alertFrequencySchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateJobAlertInput = z.infer<typeof updateJobAlertSchema>;

export const jobAlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  criteria: alertCriteriaSchema,
  frequency: alertFrequencySchema,
  isActive: z.boolean(),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
});
export type JobAlertDto = z.infer<typeof jobAlertSchema>;

export const notificationTypeSchema = z.enum(["job_alert", "daily_brief"]);

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;
