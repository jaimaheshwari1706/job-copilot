import { z } from "zod";

export const evidenceItemSchema = z.object({
  type: z.enum(["skill", "experience", "role", "project", "education", "preference"]),
  requirement: z.string(),
  status: z.enum(["matched", "missing", "partial", "no_evidence"]),
  strength: z.number(),
});

export const penaltyItemSchema = z.object({
  reason: z.string(),
  amount: z.number(),
});

export const matchBreakdownSchema = z.object({
  skills: z.number(),
  experience: z.number(),
  projects: z.number(),
  role: z.number(),
  education: z.number(),
  preferences: z.number(),
});

export const matchSchema = z.object({
  jobId: z.string(),
  overallScore: z.number(),
  confidence: z.number(),
  breakdown: matchBreakdownSchema,
  matchedSkills: z.array(z.string()),
  missingRequiredSkills: z.array(z.string()),
  missingPreferredSkills: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
  penalties: z.array(penaltyItemSchema),
  scoringVersion: z.number(),
  computedAt: z.string(),
});
export type Match = z.infer<typeof matchSchema>;
