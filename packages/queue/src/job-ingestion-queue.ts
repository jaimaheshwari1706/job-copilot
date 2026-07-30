import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES, type JobIngestionJob } from "@job-copilot/shared";
import { getRedisConnection } from "./redis.js";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 50,
};

export function createJobIngestionQueue(redisUrl: string) {
  return new Queue<JobIngestionJob>(QUEUE_NAMES.JOB_INGESTION, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

/**
 * Registers the recurring ingestion schedule (real cron-style repeatable
 * job, not a frontend setInterval — per Phase 0 §25/§26: background jobs
 * are processed by workers, never client-side timers). Idempotent: BullMQ
 * dedupes repeatable jobs by their repeat key, so calling this on every
 * worker boot is safe.
 */
export async function scheduleJobIngestion(redisUrl: string, intervalMs: number) {
  const queue = createJobIngestionQueue(redisUrl);
  await queue.add(
    "scheduled-ingestion",
    { provider: "demo" },
    { repeat: { every: intervalMs }, jobId: "scheduled-demo-ingestion" },
  );
}
