import type { HydratedDocument } from "mongoose";
import { Profile, User, type ProfileDoc } from "@job-copilot/db";
import { loadSkillNormalizer } from "@job-copilot/domain";
import type { OnboardingInput, ProfileUpdateInput, Profile as ProfileDto } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";

function toProfileDto(profile: HydratedDocument<ProfileDoc>): ProfileDto {
  return {
    userId: String(profile.userId),
    name: profile.name ?? undefined,
    currentRole: profile.currentRole ?? undefined,
    experienceYears: profile.experienceYears ?? undefined,
    location: profile.location ?? undefined,
    summary: profile.summary ?? undefined,
    targetRoles: profile.targetRoles ?? [],
    preferredLocations: profile.preferredLocations ?? [],
    workMode: profile.workMode as ProfileDto["workMode"],
    expectedSalary: profile.expectedSalary
      ? {
          min: profile.expectedSalary.min ?? undefined,
          max: profile.expectedSalary.max ?? undefined,
          currency: profile.expectedSalary.currency ?? "USD",
        }
      : undefined,
    links: profile.links
      ? {
          github: profile.links.github ?? undefined,
          linkedin: profile.links.linkedin ?? undefined,
          portfolio: profile.links.portfolio ?? undefined,
        }
      : undefined,
    skills: (profile.skills ?? []) as ProfileDto["skills"],
    employmentHistory: (profile.employmentHistory ?? []) as ProfileDto["employmentHistory"],
    education: (profile.education ?? []) as ProfileDto["education"],
    projects: (profile.projects ?? []) as ProfileDto["projects"],
    certifications: (profile.certifications ?? []) as ProfileDto["certifications"],
    onboardingCompletedAt: profile.onboardingCompletedAt
      ? profile.onboardingCompletedAt.toISOString()
      : null,
  };
}

/** Every user gets a profile document lazily on first access — never a 404 for "no profile yet". */
async function getOrCreateProfile(userId: string): Promise<HydratedDocument<ProfileDoc>> {
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({ userId });
  }
  return profile;
}

export async function getProfile(userId: string): Promise<ProfileDto> {
  const profile = await getOrCreateProfile(userId);
  return toProfileDto(profile);
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileDto> {
  const profile = await getOrCreateProfile(userId);

  if (input.name !== undefined) profile.name = input.name;
  if (input.currentRole !== undefined) profile.currentRole = input.currentRole;
  if (input.experienceYears !== undefined) profile.experienceYears = input.experienceYears;
  if (input.location !== undefined) profile.location = input.location;
  if (input.summary !== undefined) profile.summary = input.summary;
  if (input.targetRoles !== undefined) profile.targetRoles = input.targetRoles;
  if (input.preferredLocations !== undefined) profile.preferredLocations = input.preferredLocations;
  if (input.workMode !== undefined) profile.workMode = input.workMode;
  if (input.expectedSalary !== undefined) {
    profile.expectedSalary = {
      ...profile.expectedSalary,
      ...input.expectedSalary,
    };
  }
  if (input.links !== undefined) {
    profile.links = { ...profile.links, ...input.links };
  }
  // Full-array replace semantics — the standalone profile editor sends the
  // complete list each time it saves. Onboarding uses submitOnboarding
  // below instead, which merges rather than replaces skills.
  // .set() is used here (rather than direct assignment) because Mongoose's
  // DocumentArray type is stricter than a plain array at the type level,
  // even though both are accepted identically at runtime.
  if (input.skills !== undefined) {
    const skillNormalizer = await loadSkillNormalizer();
    profile.set(
      "skills",
      input.skills.map((s) => ({ ...s, name: skillNormalizer.normalize(s.name) })),
    );
  }
  if (input.employmentHistory !== undefined) profile.set("employmentHistory", input.employmentHistory);
  if (input.education !== undefined) profile.set("education", input.education);
  if (input.projects !== undefined) profile.set("projects", input.projects);
  if (input.certifications !== undefined) profile.set("certifications", input.certifications);

  await profile.save();
  return toProfileDto(profile);
}

/**
 * Saves onboarding progress without marking it complete — lets the wizard
 * persist each step (§5: "Show onboarding progress") in case the user
 * leaves partway through.
 */
export async function saveOnboardingProgress(
  userId: string,
  input: Partial<OnboardingInput>,
): Promise<ProfileDto> {
  const profile = await getOrCreateProfile(userId);
  await applyOnboardingFields(profile, input);
  await profile.save();
  return toProfileDto(profile);
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<ProfileDto> {
  const profile = await getOrCreateProfile(userId);
  await applyOnboardingFields(profile, input);
  profile.onboardingCompletedAt = new Date();
  await profile.save();

  // Keep the user's display name in sync so the topbar/greeting reflect it
  // without a second round trip from the frontend.
  if (input.name) {
    await User.updateOne({ _id: userId }, { $set: { name: input.name } });
  }

  return toProfileDto(profile);
}

async function applyOnboardingFields(
  profile: HydratedDocument<ProfileDoc>,
  input: Partial<OnboardingInput>,
) {
  if (input.name !== undefined) profile.name = input.name;
  if (input.currentRole !== undefined) profile.currentRole = input.currentRole;
  if (input.experienceYears !== undefined) profile.experienceYears = input.experienceYears;
  if (input.location !== undefined) profile.location = input.location;
  if (input.targetRoles !== undefined) profile.targetRoles = input.targetRoles;
  if (input.preferredLocations !== undefined) profile.preferredLocations = input.preferredLocations;
  if (input.workMode !== undefined) profile.workMode = input.workMode;

  if (input.skills !== undefined) {
    // Merge by name rather than replace — onboarding-entered skills are
    // user-sourced and confirmed by definition (per Phase 0: AI-extracted
    // data must never silently overwrite user-confirmed data; the reverse
    // is safe, so a plain merge here is fine). Normalized BEFORE the merge
    // so "React.js" typed during onboarding and a pre-existing "React"
    // entry correctly collapse into one, per amendment #6.
    const skillNormalizer = await loadSkillNormalizer();
    const normalizedInput = skillNormalizer.normalizeAll(input.skills);

    const existingNames = new Set((profile.skills ?? []).map((s) => s.name.toLowerCase()));
    const merged: Array<{ name: string; source: "user" | "ai_extracted" | "ai_confirmed"; confirmed: boolean }> =
      (profile.skills ?? []).map((s) => ({ name: s.name, source: s.source, confirmed: s.confirmed }));
    for (const name of normalizedInput) {
      if (!existingNames.has(name.toLowerCase())) {
        merged.push({ name, source: "user", confirmed: true });
        existingNames.add(name.toLowerCase());
      }
    }
    profile.set("skills", merged);
  }

  if (
    input.expectedSalaryMin !== undefined ||
    input.expectedSalaryMax !== undefined ||
    input.expectedSalaryCurrency !== undefined
  ) {
    profile.expectedSalary = {
      min: input.expectedSalaryMin ?? profile.expectedSalary?.min,
      max: input.expectedSalaryMax ?? profile.expectedSalary?.max,
      currency: input.expectedSalaryCurrency ?? profile.expectedSalary?.currency ?? "USD",
    };
  }

  if (input.github !== undefined || input.linkedin !== undefined || input.portfolio !== undefined) {
    profile.links = {
      github: input.github || profile.links?.github,
      linkedin: input.linkedin || profile.links?.linkedin,
      portfolio: input.portfolio || profile.links?.portfolio,
    };
  }
}

export async function confirmSkills(userId: string, skillNames: string[]): Promise<ProfileDto> {
  const profile = await getOrCreateProfile(userId);
  const skillNormalizer = await loadSkillNormalizer();
  const nameSet = new Set(skillNames.map((n) => skillNormalizer.normalize(n).toLowerCase()));

  profile.set(
    "skills",
    (profile.skills ?? []).map((skill) =>
      nameSet.has(skill.name.toLowerCase())
        ? { name: skill.name, source: "ai_confirmed" as const, confirmed: true }
        : { name: skill.name, source: skill.source, confirmed: skill.confirmed },
    ),
  );

  await profile.save();
  return toProfileDto(profile);
}

export async function assertProfileExists(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized("User not found");
}
