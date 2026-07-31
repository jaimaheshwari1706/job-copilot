import { z } from "zod";
import { matchBreakdownSchema, evidenceItemSchema, penaltyItemSchema } from "./match.js";

export const jdAnalysisRequestSchema = z.object({
  jobDescriptionText: z.string().trim().min(50, "Paste the full job description (at least 50 characters)"),
});
export type JdAnalysisRequest = z.infer<typeof jdAnalysisRequestSchema>;

/** The structured shape the AI must produce — validated, never freeform prose parsed after the fact. */
export const aiCommentarySchema = z.object({
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  suggestions: z.array(z.string()).max(6),
});
export type AiCommentary = z.infer<typeof aiCommentarySchema>;

export const jdAnalysisResultSchema = z.object({
  overallScore: z.number(),
  confidence: z.number(),
  breakdown: matchBreakdownSchema,
  matchedSkills: z.array(z.string()),
  missingRequiredSkills: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
  penalties: z.array(penaltyItemSchema),
  // AI-generated prose commentary layered on top of the deterministic
  // analysis above. Null (not empty arrays) when AI isn't configured —
  // the deterministic part is still genuinely useful on its own, and the
  // frontend must be able to tell "no AI available" apart from "AI found
  // nothing to say" (Phase 0: AI explains, never fakes when absent).
  aiCommentary: aiCommentarySchema.nullable(),
  aiAvailable: z.boolean(),
});
export type JdAnalysisResult = z.infer<typeof jdAnalysisResultSchema>;

export const coverLetterToneSchema = z.enum(["professional", "concise", "technical", "conversational"]);

export const generateCoverLetterRequestSchema = z.object({
  jobId: z.string(),
  tone: coverLetterToneSchema.default("professional"),
});
export type GenerateCoverLetterRequest = z.infer<typeof generateCoverLetterRequestSchema>;

export const updateCoverLetterSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});
export type UpdateCoverLetterInput = z.infer<typeof updateCoverLetterSchema>;

export const coverLetterSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  tone: coverLetterToneSchema,
  content: z.string(),
  generatedAt: z.string(),
  editedAt: z.string().nullable(),
  userEdited: z.boolean(),
});
export type CoverLetterDto = z.infer<typeof coverLetterSchema>;
