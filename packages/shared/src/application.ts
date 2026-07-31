import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const jobSnapshotSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  applyUrl: z.string().optional(),
});

const recruiterContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

const salaryInfoSchema = z.object({
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  currency: z.string().optional(),
});

/**
 * jobId is optional (amendment #13) — a user can track an application to
 * a job found outside this system. When jobId IS provided, the backend
 * fills jobSnapshot from the stored Job rather than trusting the client's
 * copy; when it isn't, jobSnapshot is required directly from the client.
 */
export const createApplicationSchema = z
  .object({
    jobId: z.string().optional(),
    jobSnapshot: jobSnapshotSchema.optional(),
    status: applicationStatusSchema.default("saved"),
    source: z.string().optional(),
  })
  .refine((data) => data.jobId || data.jobSnapshot, {
    message: "Either jobId or jobSnapshot must be provided",
  });
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  recruiterContact: recruiterContactSchema.optional(),
  interviewDate: z.string().datetime().optional().or(z.literal("")),
  salaryInfo: salaryInfoSchema.optional(),
});
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const addApplicationNoteSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
export type AddApplicationNoteInput = z.infer<typeof addApplicationNoteSchema>;

export const applicationSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  jobSnapshot: jobSnapshotSchema,
  status: applicationStatusSchema,
  coverLetterId: z.string().nullable(),
  appliedAt: z.string().nullable(),
  recruiterContact: recruiterContactSchema.optional(),
  interviewDate: z.string().nullable(),
  salaryInfo: salaryInfoSchema.optional(),
  source: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Application = z.infer<typeof applicationSchema>;

export const applicationEventSchema = z.object({
  id: z.string(),
  type: z.enum(["status_change", "interview_scheduled", "created"]),
  fromStatus: applicationStatusSchema.optional(),
  toStatus: applicationStatusSchema.optional(),
  createdAt: z.string(),
});
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;

export const applicationNoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
});
export type ApplicationNote = z.infer<typeof applicationNoteSchema>;
