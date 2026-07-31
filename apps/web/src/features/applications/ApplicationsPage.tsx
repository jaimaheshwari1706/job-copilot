import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { useApplications } from "./applications.api";
import { ApplicationsKanban } from "./ApplicationsKanban";
import { ApplicationsTable } from "./ApplicationsTable";

export function ApplicationsPage() {
  const { data: applications, isLoading } = useApplications();
  const [view, setView] = useState<"kanban" | "table">("kanban");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Applications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {applications ? `${applications.length} tracked` : ""}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md ${view === "kanban" ? "bg-primary/10 text-primary" : "text-slate-500"}`}
            title="Kanban view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md ${view === "table" ? "bg-primary/10 text-primary" : "text-slate-500"}`}
            title="Table view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading applications...</p>
      ) : applications && applications.length > 0 ? (
        view === "kanban" ? (
          <ApplicationsKanban applications={applications} />
        ) : (
          <ApplicationsTable applications={applications} />
        )
      ) : (
        <p className="text-sm text-slate-500">
          No applications tracked yet — clicking "Apply" on a job will add it here automatically.
        </p>
      )}
    </div>
  );
}
