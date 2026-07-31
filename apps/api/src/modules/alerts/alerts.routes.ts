import { Router } from "express";
import {
  createJobAlertSchema,
  updateJobAlertSchema,
  type ApiSuccess,
  type JobAlertDto,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import * as alertsService from "./alerts.service.js";

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const alerts = await alertsService.listAlerts(req.user!.id);
    const body: ApiSuccess<JobAlertDto[]> = { success: true, data: alerts };
    res.json(body);
  }),
);

alertsRouter.post(
  "/",
  validateBody(createJobAlertSchema),
  asyncHandler(async (req, res) => {
    const alert = await alertsService.createAlert(req.user!.id, req.body);
    const body: ApiSuccess<JobAlertDto> = { success: true, data: alert };
    res.status(201).json(body);
  }),
);

alertsRouter.patch(
  "/:id",
  validateBody(updateJobAlertSchema),
  asyncHandler(async (req, res) => {
    const alert = await alertsService.updateAlert(req.user!.id, req.params.id!, req.body);
    const body: ApiSuccess<JobAlertDto> = { success: true, data: alert };
    res.json(body);
  }),
);

alertsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await alertsService.deleteAlert(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ deleted: true }> = { success: true, data: { deleted: true } };
    res.json(body);
  }),
);
