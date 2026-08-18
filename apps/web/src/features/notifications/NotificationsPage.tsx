import { Bell, Sparkles } from "lucide-react";
import type { NotificationDto } from "@job-copilot/shared";
import { useNotifications, useMarkNotificationRead } from "./notifications.api";

function NotificationIcon({ type }: { type: NotificationDto["type"] }) {
  return type === "daily_brief" ? (
    <Sparkles size={16} className="text-primary" />
  ) : (
    <Bell size={16} className="text-slate-500 dark:text-slate-400" />
  );
}

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Notifications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Alert matches and your daily job brief.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.isRead && markRead.mutate(n.id)}
              className={`w-full text-left rounded-xl border p-4 space-y-1 transition-colors ${
                n.isRead ? "border-border bg-surface" : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-2">
                <NotificationIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-line">{n.body}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
      )}
    </div>
  );
}
