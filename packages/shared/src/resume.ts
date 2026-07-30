import { z } from "zod";

export const stageStatusSchema = z.enum([
  "pending",
  "processing",
  "complete",
  "failed",
  "not_started",
]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const resumeSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  isPrimary: z.boolean(),
  uploadStatus: stageStatusSchema,
  textExtractionStatus: stageStatusSchema,
  structureExtractionStatus: stageStatusSchema,
  confirmationStatus: stageStatusSchema,
  parseError: z.string().optional(),
  rawText: z.string().optional(),
  structuredData: z.unknown().optional(),
  userCorrections: z.unknown().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Resume = z.infer<typeof resumeSchema>;

export const resumeCorrectionsSchema = z.object({
  userCorrections: z.record(z.unknown()),
});
export type ResumeCorrectionsInput = z.infer<typeof resumeCorrectionsSchema>;

/** Typed BullMQ payload/result contract for the resume-parsing queue (Phase 0 amendment #14). */
export const resumeParseJobSchema = z.object({
  resumeId: z.string(),
  userId: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
});
export type ResumeParseJob = z.infer<typeof resumeParseJobSchema>;

export const resumeParseResultSchema = z.object({
  resumeId: z.string(),
  status: z.enum(["complete", "failed"]),
  charCount: z.number().optional(),
  error: z.string().optional(),
});
export type ResumeParseResult = z.infer<typeof resumeParseResultSchema>;
