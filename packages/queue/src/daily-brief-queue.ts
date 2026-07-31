import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "@job-copilot/shared";
import { getRedisConnection } from "./redis.js";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: "exponential", delay: 10000 },
  removeOnComplete: 10,
  removeOnFail: 10,
};

export function createDailyBriefQueue(redisUrl: string) {
  return new Queue(QUEUE_NAMES.DAILY_BRIEF, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export async function scheduleDailyBrief(redisUrl: string, intervalMs: number) {
  const queue = createDailyBriefQueue(redisUrl);
  await queue.add("daily-brief", {}, { repeat: { every: intervalMs }, jobId: "scheduled-daily-brief" });
}
