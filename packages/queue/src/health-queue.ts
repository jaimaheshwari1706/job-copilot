import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES, type HealthPingJob } from "@job-copilot/shared";
import { getRedisConnection } from "./redis.js";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: 50,
  removeOnFail: 50,
};

/**
 * Typed producer-side contract for the health-ping queue.
 * Every real business queue added in later phases should follow this same
 * pattern: a typed payload (from packages/shared), an explicit retry
 * policy, and a single factory function rather than ad-hoc `new Queue()`
 * calls scattered through the codebase.
 */
export function createHealthQueue(redisUrl: string) {
  return new Queue<HealthPingJob>(QUEUE_NAMES.HEALTH_PING, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}
