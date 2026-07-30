import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES, type ResumeParseJob } from "@job-copilot/shared";
import { getRedisConnection } from "./redis.js";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2, // parsing failures are usually deterministic (bad file), so limited retries
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 100,
};

export function createResumeParseQueue(redisUrl: string) {
  return new Queue<ResumeParseJob>(QUEUE_NAMES.RESUME_PARSE, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}
