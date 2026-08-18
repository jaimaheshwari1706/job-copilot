import { useState } from "react";
import { Link } from "react-router-dom";
import { APPLICATION_STATUS_ORDER, type Application, type ApplicationStatus } from "@job-copilot/shared";
import { useUpdateApplication } from "./applications.api";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function ApplicationCard({ app, onDragStart }: { app: Application; onDragStart: (id: string) => void }) {
  return (
    <Link
      to={`/applications/${app.id}`}
      draggable
      onDragStart={() => onDragStart(app.id)}
      className="block rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40 cursor-grab active:cursor-grabbing"
    >
      <p className="font-medium truncate">{app.jobSnapshot.title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.jobSnapshot.company}</p>
    </Link>
  );
}

export function ApplicationsKanban({ applications }: { applications: Application[] }) {
  const updateApplication = useUpdateApplication();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);

  function handleDrop(status: ApplicationStatus) {
    if (draggingId) {
      const app = applications.find((a) => a.id === draggingId);
      if (app && app.status !== status) {
        updateApplication.mutate({ id: draggingId, status });
      }
    }
    setDraggingId(null);
    setDragOverStatus(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {APPLICATION_STATUS_ORDER.map((status) => {
        const columnApps = applications.filter((a) => a.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={() => handleDrop(status)}
            className={`w-64 shrink-0 rounded-xl border p-3 space-y-2 transition-colors ${
              dragOverStatus === status ? "border-primary bg-primary/5" : "border-border bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {STATUS_LABELS[status]}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{columnApps.length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {columnApps.map((app) => (
                <ApplicationCard key={app.id} app={app} onDragStart={setDraggingId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
