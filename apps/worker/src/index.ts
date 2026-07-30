import { connectMongo } from "@job-copilot/db";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createHealthPingWorker } from "./processors/health-ping.processor.js";

async function main() {
  await connectMongo({ uri: env.MONGO_URI, serviceName: "worker" });

  const healthPingWorker = createHealthPingWorker();
  healthPingWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "health-ping job completed");
  });
  healthPingWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "health-ping job failed");
  });

  logger.info("worker started, listening for queued jobs");

  const shutdown = async () => {
    logger.info("shutting down worker...");
    await healthPingWorker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Fatal worker startup error");
  process.exit(1);
});
