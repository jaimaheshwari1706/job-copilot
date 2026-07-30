import { Router } from "express";
import { jobSearchQuerySchema, recommendedJobsQuerySchema, type ApiSuccess, type Job as JobDto, type JobSearchResult } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { ApiError } from "../../lib/errors.js";
import * as jobsService from "./jobs.service.js";

export const jobsRouter = Router();
jobsRouter.use(requireAuth);

jobsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = jobSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.validation("Invalid search parameters", parsed.error.flatten().fieldErrors);
    }
    const result = await jobsService.searchJobs(parsed.data, req.user!.id);
    const body: ApiSuccess<JobSearchResult> = { success: true, data: result };
    res.json(body);
  }),
);

jobsRouter.get(
  "/saved",
  asyncHandler(async (req, res) => {
    const jobs = await jobsService.listSavedJobs(req.user!.id, "saved");
    const body: ApiSuccess<JobDto[]> = { success: true, data: jobs };
    res.json(body);
  }),
);

jobsRouter.get(
  "/hidden",
  asyncHandler(async (req, res) => {
    const jobs = await jobsService.listSavedJobs(req.user!.id, "hidden");
    const body: ApiSuccess<JobDto[]> = { success: true, data: jobs };
    res.json(body);
  }),
);

jobsRouter.get(
  "/recommended",
  asyncHandler(async (req, res) => {
    const parsed = recommendedJobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.validation("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }
    const result = await jobsService.getRecommendedJobs(req.user!.id, parsed.data);
    const body: ApiSuccess<JobSearchResult> = { success: true, data: result };
    res.json(body);
  }),
);

jobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const job = await jobsService.getJobById(req.params.id!, req.user!.id);
    const body: ApiSuccess<JobDto> = { success: true, data: job };
    res.json(body);
  }),
);

jobsRouter.post(
  "/:id/save",
  asyncHandler(async (req, res) => {
    await jobsService.setSavedStatus(req.user!.id, req.params.id!, "saved");
    const body: ApiSuccess<{ saved: true }> = { success: true, data: { saved: true } };
    res.json(body);
  }),
);

jobsRouter.post(
  "/:id/hide",
  asyncHandler(async (req, res) => {
    await jobsService.setSavedStatus(req.user!.id, req.params.id!, "hidden");
    const body: ApiSuccess<{ hidden: true }> = { success: true, data: { hidden: true } };
    res.json(body);
  }),
);

jobsRouter.delete(
  "/:id/save",
  asyncHandler(async (req, res) => {
    await jobsService.clearSavedStatus(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ cleared: true }> = { success: true, data: { cleared: true } };
    res.json(body);
  }),
);

/** Admin-only: manually trigger an ingestion run instead of waiting for the hourly schedule. */
jobsRouter.post(
  "/admin/ingest",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const provider = typeof req.body?.provider === "string" ? req.body.provider : "demo";
    const result = await jobsService.triggerIngestion(provider);
    const body: ApiSuccess<{ enqueued: true }> = { success: true, data: result };
    res.status(202).json(body);
  }),
);

jobsRouter.get(
  "/admin/ingestion-runs",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const runs = await jobsService.listIngestionRuns();
    const body: ApiSuccess<typeof runs> = { success: true, data: runs };
    res.json(body);
  }),
);
