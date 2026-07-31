import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@job-copilot/shared";
import { getRedisConnection } from "@job-copilot/queue";
import { Job, Profile, Notification } from "@job-copilot/db";
import { computeOrCacheMatch, buildDailyBriefSummary } from "@job-copilot/domain";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const MAX_CANDIDATE_JOBS = 200;
const MAX_USERS_PER_RUN = 100; // bounds cost on a growing user base; a real deployment would shard/paginate this
const RELEVANT_THRESHOLD = 30; // same threshold used for "relevant" elsewhere (recommendations, skill gap)
const STRONG_MATCH_THRESHOLD = 80;
const TOP_OPPORTUNITIES_COUNT = 3;

export function createDailyBriefWorker() {
  return new Worker(
    QUEUE_NAMES.DAILY_BRIEF,
    async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newJobsCount = await Job.countDocuments({ status: "active", createdAt: { $gte: since } });

      const candidateJobs = await Job.find({ status: "active" }).limit(MAX_CANDIDATE_JOBS);

      // Only users who've completed onboarding have enough profile data
      // for matching to be meaningful.
      const profiles = await Profile.find({ onboardingCompletedAt: { $ne: null } }).limit(MAX_USERS_PER_RUN);

      let briefsSent = 0;

      for (const profile of profiles) {
        const userId = String(profile.userId);
        const scored = await Promise.all(
          candidateJobs.map(async (job) => ({
            job,
            match: await computeOrCacheMatch(userId, String(job._id)),
          })),
        );

        const relevant = scored.filter((s) => (s.match?.overallScore ?? 0) >= RELEVANT_THRESHOLD);
        const strongMatches = relevant.filter((s) => s.match!.overallScore >= STRONG_MATCH_THRESHOLD);

        const topOpportunities = [...relevant]
          .sort((a, b) => b.match!.overallScore - a.match!.overallScore)
          .slice(0, TOP_OPPORTUNITIES_COUNT)
          .map((s) => ({ title: s.job.title, company: s.job.company, score: s.match!.overallScore }));

        // Skip sending a brief with nothing relevant to say — a "0 new, 0
        // relevant" notification every day would just be noise.
        if (relevant.length === 0) continue;

        const { title, body } = buildDailyBriefSummary({
          newJobsCount,
          relevantJobsCount: relevant.length,
          strongMatchesCount: strongMatches.length,
          topOpportunities,
        });

        await Notification.create({
          userId,
          type: "daily_brief",
          title,
          body,
          data: { topJobIds: topOpportunities.map((_, i) => String(relevant[i]!.job._id)) },
        });
        briefsSent++;
      }

      logger.info({ profilesConsidered: profiles.length, briefsSent, newJobsCount }, "Daily brief run complete");

      return { profilesConsidered: profiles.length, briefsSent };
    },
    { connection: getRedisConnection(env.REDIS_URL), concurrency: 1 },
  );
}
