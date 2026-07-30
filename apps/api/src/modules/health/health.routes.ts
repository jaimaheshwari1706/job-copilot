import { Router } from "express";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createHealthQueue, getRedisConnection } from "@job-copilot/queue";
import type { ApiSuccess, HealthStatus } from "@job-copilot/shared";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/async-handler.js";

export const healthRouter = Router();

/** Cheap liveness probe — no dependency checks. */
healthRouter.get("/", (_req, res) => {
  const body: ApiSuccess<{ status: "ok"; service: string }> = {
    success: true,
    data: { status: "ok", service: "api" },
  };
  res.json(body);
});

/** Deep readiness probe — verifies Mongo + Redis are actually reachable. */
healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const mongoOk = mongoose.connection.readyState === 1;

    let redisOk = false;
    try {
      const redis = getRedisConnection(env.REDIS_URL);
      const pong = await redis.ping();
      redisOk = pong === "PONG";
    } catch {
      redisOk = false;
    }

    const status: HealthStatus = {
      status: mongoOk && redisOk ? "ok" : "degraded",
      service: "api",
      timestamp: new Date().toISOString(),
      checks: {
        mongo: mongoOk ? "ok" : "down",
        redis: redisOk ? "ok" : "down",
      },
    };

    const body: ApiSuccess<HealthStatus> = { success: true, data: status };
    res.status(status.status === "ok" ? 200 : 503).json(body);
  }),
);

/**
 * Enqueues a health-ping job onto BullMQ so we can verify, end to end,
 * that API -> Redis -> Worker -> Mongo actually works. This is Phase-1
 * infrastructure verification only — not a real business queue.
 */
healthRouter.post(
  "/ping-worker",
  asyncHandler(async (_req, res) => {
    const queue = createHealthQueue(env.REDIS_URL);
    const pingId = randomUUID();
    await queue.add("ping", { pingId, sentAt: new Date().toISOString() });

    const body: ApiSuccess<{ enqueued: true; pingId: string }> = {
      success: true,
      data: { enqueued: true, pingId },
      message: "Health ping enqueued. Check GET /health/ping-worker/:pingId shortly.",
    };
    res.status(202).json(body);
  }),
);

healthRouter.get(
  "/ping-worker/:pingId",
  asyncHandler(async (req, res) => {
    const { SystemHealthCheck } = await import("@job-copilot/db");
    const doc = await SystemHealthCheck.findOne({ pingId: req.params.pingId }).lean();

    const body: ApiSuccess<{ received: boolean; document: unknown }> = {
      success: true,
      data: { received: Boolean(doc), document: doc ?? null },
    };
    res.json(body);
  }),
);
