import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "@job-copilot/shared";
import { getRedisConnection } from "./redis.js";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 20,
  removeOnFail: 20,
};

export function createAlertsQueue(redisUrl: string) {
  return new Queue(QUEUE_NAMES.ALERTS_CHECK, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

/**
 * Registers the recurring alert-check schedule — a real BullMQ repeatable
 * job, not a frontend timer (Phase 0 §25). Idempotent: safe on every
 * worker boot since BullMQ dedupes repeatable jobs by their jobId.
 */
export async function scheduleAlertsCheck(redisUrl: string, intervalMs: number) {
  const queue = createAlertsQueue(redisUrl);
  await queue.add("check-alerts", {}, { repeat: { every: intervalMs }, jobId: "scheduled-alerts-check" });
}
