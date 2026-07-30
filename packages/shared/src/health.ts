import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.string(),
  timestamp: z.string(),
  checks: z
    .object({
      mongo: z.enum(["ok", "down"]).optional(),
      redis: z.enum(["ok", "down"]).optional(),
      queue: z.enum(["ok", "down"]).optional(),
    })
    .optional(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

/**
 * Payload contract for the Phase-1 sanity-check queue.
 * This is NOT a business queue — it exists only to prove
 * API -> Redis -> BullMQ -> Worker -> Mongo works end to end.
 */
export const healthPingJobSchema = z.object({
  pingId: z.string(),
  sentAt: z.string(),
});
export type HealthPingJob = z.infer<typeof healthPingJobSchema>;

export const healthPingResultSchema = z.object({
  pingId: z.string(),
  receivedAt: z.string(),
  processedBy: z.literal("worker"),
});
export type HealthPingResult = z.infer<typeof healthPingResultSchema>;
