/**
 * Canonical queue name registry. Business queues (job-ingestion, matching,
 * resume-parsing, ai-generation, alerts, daily-brief) are added in their
 * respective phases. Phase 1 only defines the health-check queue used to
 * validate the Redis/BullMQ wiring between apps/api and apps/worker.
 */
export const QUEUE_NAMES = {
  HEALTH_PING: "health-ping",
  RESUME_PARSE: "resume-parse",
  JOB_INGESTION: "job-ingestion",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
