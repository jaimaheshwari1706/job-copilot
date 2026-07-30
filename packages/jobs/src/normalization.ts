const TITLE_SYNONYMS: Record<string, string> = {
  "sr.": "senior",
  sr: "senior",
  jr: "junior",
  "jr.": "junior",
  swe: "software engineer",
  eng: "engineer",
  dev: "developer",
};

/**
 * Lowercases, strips punctuation, and expands a small set of common
 * abbreviations so "Sr. Software Engineer" and "senior software engineer"
 * normalize to the same string for search/dedup purposes.
 */
export function normalizeTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => TITLE_SYNONYMS[word] ?? word)
    .join(" ");
  return cleaned.trim();
}
