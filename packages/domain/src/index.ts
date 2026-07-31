/**
 * @job-copilot/domain
 *
 * Business logic shared by apps/api and apps/worker: skill normalization
 * (Phase 5.5) and the matching engine (Phase 6). AI-powered features
 * (Phase 8+) explain match results — they never determine the score.
 */
export * from "./skills/canonical-skills.data.js";
export * from "./skills/skill-normalizer.js";
export * from "./skills/seed-skills.js";
export * from "./skills/load-skill-normalizer.js";
export * from "./skills/skill-gap-analysis.js";
export * from "./matching/types.js";
export * from "./matching/weights.config.js";
export * from "./matching/match.pipeline.js";
export * from "./matching/compute-match.js";
export * from "./alerts/alert-matcher.js";
export * from "./alerts/daily-brief.js";
export * from "./ingestion/ingest-jobs.js";
