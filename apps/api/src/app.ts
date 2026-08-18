import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { resumeRouter } from "./modules/resume/resume.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { matchesRouter } from "./modules/matches/matches.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { skillsRouter } from "./modules/skills/skills.routes.js";
import { interviewRouter } from "./modules/interviews/interview.routes.js";
import { alertsRouter } from "./modules/alerts/alerts.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/resumes", resumeRouter);
  app.use("/jobs", jobsRouter);
  app.use("/matches", matchesRouter);
  app.use("/ai", aiRouter);
  app.use("/applications", applicationsRouter);
  app.use("/skills", skillsRouter);
  app.use("/interview", interviewRouter);
  app.use("/alerts", alertsRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/dashboard", dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
