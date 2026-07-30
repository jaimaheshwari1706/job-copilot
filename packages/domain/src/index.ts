/**
 * @job-copilot/domain
 *
 * Owns pure business logic shared by apps/api and apps/worker — most
 * importantly the matching engine's constraint checks, scorers, and
 * penalty rules (Phase 6+). Deliberately empty in Phase 1: this file
 * exists to reserve the package boundary and its dependency direction
 * (api -> domain, worker -> domain, never the reverse) so later phases
 * don't need to restructure imports.
 */
export {};
