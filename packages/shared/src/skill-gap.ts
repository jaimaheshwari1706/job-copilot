import { z } from "zod";

export const skillDemandSchema = z.object({
  skill: z.string(),
  demandCount: z.number(),
  demandPercentage: z.number(),
  isRequired: z.boolean(),
  possessed: z.boolean(),
});

export const missingSkillRecommendationSchema = skillDemandSchema.extend({
  jobsUnlocked: z.number(),
});

export const skillGapAnalysisResultSchema = z.object({
  totalRelevantJobs: z.number(),
  existingSkills: z.array(z.string()),
  skillDemand: z.array(skillDemandSchema),
  topMissingSkills: z.array(missingSkillRecommendationSchema),
});
export type SkillGapAnalysisResult = z.infer<typeof skillGapAnalysisResultSchema>;
