/**
 * Phase 0's baseline weighting was:
 *   skills 40%, experience 20%, semantic 15%, projects 10%, role 5%,
 *   education 5%, preferences 5%
 *
 * Semantic similarity needs embeddings (Phase 8). Rather than score it as a
 * permanent 0 — which would silently cap every match at 85% regardless of
 * fit — its 15% is redistributed proportionally across the six scorers
 * available now. When semantic scoring ships, this config is the only
 * place that needs to change.
 */
export const MATCH_WEIGHTS = {
  skills: 0.47,
  experience: 0.24,
  projects: 0.12,
  role: 0.06,
  education: 0.06,
  preferences: 0.05,
} as const;

// Sanity check kept close to the config so the two can't silently drift.
const WEIGHT_SUM = Object.values(MATCH_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(WEIGHT_SUM - 1) > 0.001) {
  throw new Error(`MATCH_WEIGHTS must sum to 1, got ${WEIGHT_SUM}`);
}

/** Bump whenever scoring logic changes so cached JobMatch docs are never trusted across versions. */
export const SCORING_VERSION = 1;
