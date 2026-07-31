import { Notification } from "@job-copilot/db";
import type { NotificationDto } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";

export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return notifications.map((n) => ({
    id: String(n._id),
    type: n.type as NotificationDto["type"],
    title: n.title,
    body: n.body,
    data: (n.data as Record<string, unknown> | undefined) ?? undefined,
    isRead: n.isRead,
    createdAt: n.createdAt!.toISOString(),
  }));
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const result = await Notification.updateOne({ _id: notificationId, userId }, { $set: { isRead: true } });
  if (result.matchedCount === 0) throw ApiError.notFound("Notification not found");
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, isRead: false });
}
