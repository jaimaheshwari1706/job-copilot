import { connectMongo } from "@job-copilot/db";
import { scheduleJobIngestion, scheduleAlertsCheck, scheduleDailyBrief } from "@job-copilot/queue";
import { seedCanonicalSkills } from "@job-copilot/domain";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createHealthPingWorker } from "./processors/health-ping.processor.js";
import { createResumeParseWorker } from "./processors/resume-parse.processor.js";
import { createJobIngestionWorker } from "./processors/job-ingestion.processor.js";
import { createAlertsWorker } from "./processors/alerts.processor.js";
import { createDailyBriefWorker } from "./processors/daily-brief.processor.js";

const JOB_INGESTION_INTERVAL_MS = 60 * 60 * 1000; // hourly
const ALERTS_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly (individual alerts still respect their own daily/weekly frequency)
const DAILY_BRIEF_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

async function main() {
  await connectMongo({ uri: env.MONGO_URI, serviceName: "worker" });

  await seedCanonicalSkills();
  logger.info("Canonical skill dictionary seeded");

  const healthPingWorker = createHealthPingWorker();
  healthPingWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "health-ping job completed");
  });
  healthPingWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "health-ping job failed");
  });

  const resumeParseWorker = createResumeParseWorker();
  resumeParseWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "resume-parse job completed");
  });
  resumeParseWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "resume-parse job failed");
  });

  const jobIngestionWorker = createJobIngestionWorker();
  jobIngestionWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "job-ingestion job completed");
  });
  jobIngestionWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "job-ingestion job failed");
  });

  const alertsWorker = createAlertsWorker();
  alertsWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "alerts-check job completed");
  });
  alertsWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "alerts-check job failed");
  });

  const dailyBriefWorker = createDailyBriefWorker();
  dailyBriefWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "daily-brief job completed");
  });
  dailyBriefWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "daily-brief job failed");
  });

  await scheduleJobIngestion(env.REDIS_URL, JOB_INGESTION_INTERVAL_MS);
  await scheduleAlertsCheck(env.REDIS_URL, ALERTS_CHECK_INTERVAL_MS);
  await scheduleDailyBrief(env.REDIS_URL, DAILY_BRIEF_INTERVAL_MS);
  logger.info(
    { jobIngestionMs: JOB_INGESTION_INTERVAL_MS, alertsCheckMs: ALERTS_CHECK_INTERVAL_MS, dailyBriefMs: DAILY_BRIEF_INTERVAL_MS },
    "Scheduled recurring background jobs",
  );

  logger.info("worker started, listening for queued jobs");

  const shutdown = async () => {
    logger.info("shutting down worker...");
    await Promise.all([
      healthPingWorker.close(),
      resumeParseWorker.close(),
      jobIngestionWorker.close(),
      alertsWorker.close(),
      dailyBriefWorker.close(),
    ]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Fatal worker startup error");
  process.exit(1);
});
