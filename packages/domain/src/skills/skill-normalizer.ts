export interface CanonicalSkillEntry {
  name: string;
  aliases: string[];
}

function titleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Resolves raw skill strings (from resumes, job listings, or user input)
 * to their canonical form. Both candidate skills and job requirements must
 * pass through this before matching (Phase 0 amendment #6) so "React.js",
 * "ReactJS", and "react" all collapse to the same "React" string.
 *
 * Unrecognized skills are NOT dropped — they pass through title-cased and
 * trimmed. The dictionary is intentionally incomplete (see
 * canonical-skills.data.ts); treating an unknown skill as invalid would
 * silently lose real candidate/job data.
 */
export class SkillNormalizer {
  private readonly aliasToCanonical: Map<string, string>;

  constructor(entries: CanonicalSkillEntry[]) {
    this.aliasToCanonical = new Map();
    for (const entry of entries) {
      this.aliasToCanonical.set(entry.name.toLowerCase(), entry.name);
      for (const alias of entry.aliases) {
        this.aliasToCanonical.set(alias.toLowerCase(), entry.name);
      }
    }
  }

  normalize(raw: string): string {
    const key = raw.trim().toLowerCase();
    if (key === "") return raw.trim();
    return this.aliasToCanonical.get(key) ?? titleCase(raw);
  }

  normalizeAll(rawSkills: string[]): string[] {
    // De-duplicate after normalization — "React" and "react.js" in the same
    // list should collapse to a single "React" entry, not two.
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of rawSkills) {
      const normalized = this.normalize(raw);
      const dedupeKey = normalized.toLowerCase();
      if (normalized && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        result.push(normalized);
      }
    }
    return result;
  }

  isKnown(raw: string): boolean {
    return this.aliasToCanonical.has(raw.trim().toLowerCase());
  }
}
