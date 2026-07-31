import { Router } from "express";
import type { ApiSuccess, NotificationDto } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import * as notificationsService from "./notifications.service.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await notificationsService.listNotifications(req.user!.id);
    const body: ApiSuccess<NotificationDto[]> = { success: true, data: notifications };
    res.json(body);
  }),
);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    const body: ApiSuccess<{ count: number }> = { success: true, data: { count } };
    res.json(body);
  }),
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await notificationsService.markNotificationRead(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ read: true }> = { success: true, data: { read: true } };
    res.json(body);
  }),
);
