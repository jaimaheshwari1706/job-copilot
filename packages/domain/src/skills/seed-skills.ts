import { Skill } from "@job-copilot/db";
import { CANONICAL_SKILLS_SEED } from "./canonical-skills.data.js";

/**
 * Upserts the curated dictionary into the skills collection. Idempotent —
 * safe to call on every api/worker startup without creating duplicates or
 * clobbering fields a future admin UI might let someone edit (uses $setOnInsert
 * for aliases/category so an existing hand-edited entry isn't silently reset).
 */
export async function seedCanonicalSkills(): Promise<void> {
  await Promise.all(
    CANONICAL_SKILLS_SEED.map((entry) =>
      Skill.updateOne(
        { name: entry.name },
        {
          $setOnInsert: {
            name: entry.name,
            aliases: entry.aliases,
            category: entry.category,
            relatedSkills: entry.relatedSkills ?? [],
          },
        },
        { upsert: true },
      ),
    ),
  );
}
