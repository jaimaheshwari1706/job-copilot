import type { ScorerOutput } from "./types.js";

/**
 * Confidence is the fraction of scoring dimensions that actually had
 * evidence to work with. Semantic similarity always counts as a missing
 * dimension right now (Phase 8), so confidence can never reach 1.0 until
 * that ships — an honest ceiling rather than a number that implies more
 * certainty than the system actually has.
 */
export function computeConfidence(scorers: Record<string, ScorerOutput>): number {
  const SEMANTIC_NOT_YET_AVAILABLE = 1; // counts as one missing-evidence dimension
  const dimensionsWithEvidence = Object.values(scorers).filter((s) => s.hasEvidence).length;
  const totalDimensions = Object.keys(scorers).length + SEMANTIC_NOT_YET_AVAILABLE;
  return Math.round((dimensionsWithEvidence / totalDimensions) * 100) / 100;
}
