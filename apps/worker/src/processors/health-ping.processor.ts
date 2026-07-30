import { Worker } from "bullmq";
import { QUEUE_NAMES, healthPingJobSchema, type HealthPingResult } from "@job-copilot/shared";
import { getRedisConnection } from "@job-copilot/queue";
import { SystemHealthCheck } from "@job-copilot/db";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

/**
 * Phase-1 infrastructure processor: proves Redis -> BullMQ -> Worker -> Mongo
 * works end to end. Real business processors (job-ingestion, matching,
 * resume-parsing, ai-generation, alerts, daily-brief) are added in their
 * respective phases as separate files in this same folder, each registered
 * in src/index.ts the same way.
 */
export function createHealthPingWorker() {
  return new Worker(
    QUEUE_NAMES.HEALTH_PING,
    async (job): Promise<HealthPingResult> => {
      const payload = healthPingJobSchema.parse(job.data);

      await SystemHealthCheck.create({
        pingId: payload.pingId,
        source: "worker",
        note: `Processed ping sent at ${payload.sentAt}`,
      });

      logger.info({ pingId: payload.pingId }, "Processed health-ping job");

      return {
        pingId: payload.pingId,
        receivedAt: new Date().toISOString(),
        processedBy: "worker",
      };
    },
    { connection: getRedisConnection(env.REDIS_URL), concurrency: 5 },
  );
}
