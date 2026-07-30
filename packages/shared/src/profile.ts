import { z } from "zod";

export const workModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkMode = z.infer<typeof workModeSchema>;

export const skillEntrySchema = z.object({
  name: z.string().trim().min(1).max(60),
  source: z.enum(["user", "ai_extracted", "ai_confirmed"]).default("user"),
  confirmed: z.boolean().default(true),
});
export type SkillEntry = z.infer<typeof skillEntrySchema>;

export const employmentEntrySchema = z.object({
  company: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  start: z.string().optional(),
  end: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(z.string().max(500)).default([]),
});

export const educationEntrySchema = z.object({
  institution: z.string().trim().min(1).max(160),
  degree: z.string().optional(),
  field: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const projectEntrySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
  tech: z.array(z.string().max(60)).default([]),
  link: z.string().url().optional().or(z.literal("")),
});

export const certificationEntrySchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

const urlOrEmpty = z.string().url("Enter a valid URL").optional().or(z.literal(""));

/**
 * Onboarding covers exactly the field list from Phase 0 §5. Everything is
 * optional at the schema level so the wizard can save progress step by
 * step (§5: "Show onboarding progress") without forcing full completion
 * in one submission — completion is tracked separately via
 * `onboardingCompletedAt`, set only on the final "finish" call.
 */
export const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  currentRole: z.string().trim().max(160).optional(),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  location: z.string().trim().max(160).optional(),
  targetRoles: z.array(z.string().trim().min(1).max(120)).default([]),
  preferredLocations: z.array(z.string().trim().min(1).max(160)).default([]),
  workMode: workModeSchema.optional(),
  skills: z.array(z.string().trim().min(1).max(60)).default([]),
  expectedSalaryMin: z.coerce.number().min(0).optional(),
  expectedSalaryMax: z.coerce.number().min(0).optional(),
  expectedSalaryCurrency: z.string().length(3).default("USD"),
  github: urlOrEmpty,
  linkedin: urlOrEmpty,
  portfolio: urlOrEmpty,
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Full profile update — the superset used by the standalone Profile edit page. */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  currentRole: z.string().trim().max(160).optional(),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  location: z.string().trim().max(160).optional(),
  summary: z.string().max(2000).optional(),
  targetRoles: z.array(z.string().trim().min(1).max(120)).optional(),
  preferredLocations: z.array(z.string().trim().min(1).max(160)).optional(),
  workMode: workModeSchema.optional(),
  expectedSalary: z
    .object({
      min: z.coerce.number().min(0).optional(),
      max: z.coerce.number().min(0).optional(),
      currency: z.string().length(3).default("USD"),
    })
    .optional(),
  links: z
    .object({
      github: urlOrEmpty,
      linkedin: urlOrEmpty,
      portfolio: urlOrEmpty,
    })
    .optional(),
  skills: z.array(skillEntrySchema).optional(),
  employmentHistory: z.array(employmentEntrySchema).optional(),
  education: z.array(educationEntrySchema).optional(),
  projects: z.array(projectEntrySchema).optional(),
  certifications: z.array(certificationEntrySchema).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const confirmSkillsSchema = z.object({
  skillNames: z.array(z.string().trim().min(1)).min(1),
});
export type ConfirmSkillsInput = z.infer<typeof confirmSkillsSchema>;

/** Public-facing profile shape returned by the API. */
export const profileSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  currentRole: z.string().optional(),
  experienceYears: z.number().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  targetRoles: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  workMode: workModeSchema.optional(),
  expectedSalary: z
    .object({ min: z.number().optional(), max: z.number().optional(), currency: z.string() })
    .optional(),
  links: z
    .object({
      github: z.string().optional(),
      linkedin: z.string().optional(),
      portfolio: z.string().optional(),
    })
    .optional(),
  skills: z.array(skillEntrySchema).default([]),
  employmentHistory: z.array(employmentEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  certifications: z.array(certificationEntrySchema).default([]),
  onboardingCompletedAt: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
