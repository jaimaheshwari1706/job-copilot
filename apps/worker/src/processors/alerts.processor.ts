import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@job-copilot/shared";
import { getRedisConnection } from "@job-copilot/queue";
import { JobAlert, Job, Notification } from "@job-copilot/db";
import { jobMatchesAlertCriteria, computeOrCacheMatch } from "@job-copilot/domain";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const MAX_CANDIDATE_JOBS = 200;

function isDue(alert: { frequency: string; lastRunAt?: Date | null }): boolean {
  if (!alert.lastRunAt) return true;
  const interval = FREQUENCY_MS[alert.frequency] ?? FREQUENCY_MS.daily!;
  return Date.now() - alert.lastRunAt.getTime() >= interval;
}

export function createAlertsWorker() {
  return new Worker(
    QUEUE_NAMES.ALERTS_CHECK,
    async () => {
      const activeAlerts = await JobAlert.find({ isActive: true });
      const dueAlerts = activeAlerts.filter(isDue);

      let notificationsCreated = 0;

      for (const alert of dueAlerts) {
        // Only consider jobs posted since the last run (or the last 24h
        // for a first-ever run) so alerts don't keep re-surfacing the same
        // old postings every cycle.
        const since = alert.lastRunAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
        const candidateJobs = await Job.find({ status: "active", postedAt: { $gte: since } }).limit(
          MAX_CANDIDATE_JOBS,
        );

        const criteriaMatches = candidateJobs.filter((job) =>
          jobMatchesAlertCriteria(
            {
              title: job.title,
              skills: job.skills ?? [],
              location: job.location ?? undefined,
              workMode: job.workMode ?? undefined,
              experienceMin: job.experienceMin ?? undefined,
              salaryMax: job.salaryMax ?? undefined,
            },
            {
              keywords: alert.criteria?.keywords ?? undefined,
              skills: alert.criteria?.skills ?? undefined,
              location: alert.criteria?.location ?? undefined,
              workMode: alert.criteria?.workMode ?? undefined,
              experienceMin: alert.criteria?.experienceMin ?? undefined,
              salaryMin: alert.criteria?.salaryMin ?? undefined,
            },
          ),
        );

        let finalMatches = criteriaMatches;
        const minScore = alert.criteria?.minMatchScore ?? undefined;
        if (minScore !== undefined) {
          const scored = await Promise.all(
            criteriaMatches.map(async (job) => ({
              job,
              match: await computeOrCacheMatch(String(alert.userId), String(job._id)),
            })),
          );
          finalMatches = scored.filter((s) => (s.match?.overallScore ?? 0) >= minScore).map((s) => s.job);
        }

        if (finalMatches.length > 0) {
          const titles = finalMatches.slice(0, 5).map((j) => `${j.title} at ${j.company}`);
          await Notification.create({
            userId: alert.userId,
            type: "job_alert",
            title: `${finalMatches.length} new job${finalMatches.length === 1 ? "" : "s"} for "${alert.name}"`,
            body: titles.join(", ") + (finalMatches.length > 5 ? ", and more" : ""),
            data: { jobIds: finalMatches.map((j) => String(j._id)), alertId: String(alert._id) },
          });
          notificationsCreated++;
        }

        alert.lastRunAt = new Date();
        await alert.save();
      }

      logger.info({ checkedAlerts: dueAlerts.length, notificationsCreated }, "Alerts check complete");

      return { checkedAlerts: dueAlerts.length, notificationsCreated };
    },
    { connection: getRedisConnection(env.REDIS_URL), concurrency: 1 },
  );
}
