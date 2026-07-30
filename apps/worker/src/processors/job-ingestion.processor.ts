import { Worker } from "bullmq";
import { QUEUE_NAMES, jobIngestionJobSchema, type JobIngestionResult } from "@job-copilot/shared";
import { getRedisConnection } from "@job-copilot/queue";
import { DemoJobProvider, type JobProvider } from "@job-copilot/jobs";
import { ingestFromProvider } from "@job-copilot/domain";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const PROVIDERS: Record<string, JobProvider> = {
  demo: new DemoJobProvider(),
};

/**
 * Thin BullMQ wrapper around the queue-independent ingestFromProvider()
 * (packages/domain/src/ingestion/ingest-jobs.ts) — the actual ingestion
 * logic lives there so it can also be called directly by scripts (e.g.
 * scripts/seed.ts) without needing the queue/worker running at all.
 */
export function createJobIngestionWorker() {
  return new Worker(
    QUEUE_NAMES.JOB_INGESTION,
    async (job): Promise<JobIngestionResult> => {
      const payload = jobIngestionJobSchema.parse(job.data);
      const provider = PROVIDERS[payload.provider];
      if (!provider) throw new Error(`Unknown job provider: ${payload.provider}`);

      const stats = await ingestFromProvider(provider, { keywords: payload.keywords });
      logger.info({ provider: provider.name, ...stats }, "Job ingestion run complete");
      return { provider: provider.name, ...stats };
    },
    { connection: getRedisConnection(env.REDIS_URL), concurrency: 1 },
  );
}
