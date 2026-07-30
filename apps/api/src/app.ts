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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // required so the refresh-token cookie is sent/accepted
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // Phase 1: only the health module is mounted. auth/profile/resumes/jobs/...
  // are mounted here starting Phase 2, each as its own routes file under
  // src/modules/<domain>/.
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/resumes", resumeRouter);
  app.use("/jobs", jobsRouter);
  app.use("/matches", matchesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
