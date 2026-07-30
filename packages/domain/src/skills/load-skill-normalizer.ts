import { Skill } from "@job-copilot/db";
import { SkillNormalizer } from "./skill-normalizer.js";

let cached: { normalizer: SkillNormalizer; loadedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to avoid re-querying every request, short enough that dictionary edits propagate without a restart

export async function loadSkillNormalizer(): Promise<SkillNormalizer> {
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.normalizer;
  }

  const entries = await Skill.find().select("name aliases").lean();
  const normalizer = new SkillNormalizer(
    entries.map((e) => ({ name: e.name, aliases: e.aliases ?? [] })),
  );

  cached = { normalizer, loadedAt: Date.now() };
  return normalizer;
}

/** Exposed for tests that need to force a fresh load after seeding. */
export function clearSkillNormalizerCache(): void {
  cached = null;
}
