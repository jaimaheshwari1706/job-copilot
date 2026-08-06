import { useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { FormField } from "../../components/FormField";
import { useAlerts, useCreateAlert, useUpdateAlert, useDeleteAlert } from "./alerts.api";

export function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [minMatchScore, setMinMatchScore] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createAlert.mutate(
      {
        name,
        frequency,
        criteria: {
          keywords: keywords || undefined,
          location: location || undefined,
          minMatchScore: minMatchScore ? Number(minMatchScore) : undefined,
        },
      },
      {
        onSuccess: () => {
          setName("");
          setKeywords("");
          setLocation("");
          setMinMatchScore("");
        },
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Job Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Checked automatically in the background — no need to keep this page open.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h2 className="text-sm font-medium">New alert</h2>
        <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. React" />
          <FormField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Minimum match %"
            type="number"
            min={0}
            max={100}
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim() || createAlert.isPending}
          className="rounded-lg bg-primary-solid text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
        >
          {createAlert.isPending ? "Creating..." : "Create alert"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-sm truncate">{alert.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {alert.frequency} ·{" "}
                  {[
                    alert.criteria.keywords,
                    alert.criteria.location,
                    alert.criteria.minMatchScore ? `${alert.criteria.minMatchScore}%+ match` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No filters"}
                  {alert.lastRunAt && ` · last checked ${new Date(alert.lastRunAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={alert.isActive}
                    onChange={(e) => updateAlert.mutate({ id: alert.id, isActive: e.target.checked })}
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => deleteAlert.mutate(alert.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No alerts yet.</p>
      )}
    </div>
  );
}
