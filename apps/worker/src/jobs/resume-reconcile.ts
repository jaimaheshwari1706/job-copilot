import { Resume } from "@job-copilot/db";
import { createResumeParseQueue } from "@job-copilot/queue";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

/**
 * Resumes can be left at "pending" forever if the API process restarts (or
 * crashes) in the narrow window between creating the record and the enqueue
 * actually reaching Redis — the enqueue is fire-and-forget from the request
 * path (see apps/api resume.service.ts) so nothing else ever revisits that
 * record. The frontend polls any "pending"/"processing" resume every 1.5s
 * with no upper bound, so one orphaned record polls forever. This sweep
 * catches those and re-enqueues them so they resolve for real instead of
 * requiring a human to notice and clean up the DB.
 */
const STUCK_PENDING_THRESHOLD_MS = 2 * 60 * 1000;

export async function reconcileStuckResumes(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_PENDING_THRESHOLD_MS);
  const stuck = await Resume.find({
    textExtractionStatus: "pending",
    createdAt: { $lt: cutoff },
    deletedAt: null,
  });

  if (stuck.length === 0) return;

  logger.warn({ count: stuck.length }, "Found resumes stuck at pending — re-enqueueing");

  const queue = createResumeParseQueue(env.REDIS_URL);
  for (const resume of stuck) {
    try {
      await queue.add("parse", {
        resumeId: String(resume._id),
        userId: String(resume.userId),
        storageKey: resume.storageKey,
        mimeType: resume.mimeType,
      });
      logger.info({ resumeId: String(resume._id) }, "Re-enqueued stuck resume");
    } catch (err) {
      logger.error({ resumeId: String(resume._id), err }, "Failed to re-enqueue stuck resume");
    }
  }
}

export function scheduleResumeReconciliation(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    reconcileStuckResumes().catch((err) => logger.error({ err }, "Resume reconciliation sweep failed"));
  }, intervalMs);
}
