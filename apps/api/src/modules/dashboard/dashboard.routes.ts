import { Router } from "express";
import type { ApiSuccess, DashboardStats } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { getDashboardStats } from "./dashboard.service.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const stats = await getDashboardStats(req.user!.id);
    const body: ApiSuccess<DashboardStats> = { success: true, data: stats };
    res.json(body);
  }),
);
