import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HealthStatus } from "@job-copilot/shared";
import { apiClient } from "../lib/api-client";

function StatusPill({ label, ok }: { label: string; ok: boolean | undefined }) {
  const color =
    ok === undefined
      ? "bg-slate-200 text-slate-600"
      : ok
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}: {ok === undefined ? "checking..." : ok ? "ok" : "down"}
    </span>
  );
}

export function SystemHealthPage() {
  const [pingId, setPingId] = useState<string | null>(null);

  const readiness = useQuery({
    queryKey: ["health", "ready"],
    queryFn: () => apiClient.get<HealthStatus>("/health/ready"),
    refetchInterval: 5000,
  });

  const enqueuePing = useMutation({
    mutationFn: () => apiClient.post<{ enqueued: true; pingId: string }>("/health/ping-worker"),
    onSuccess: (data) => setPingId(data.pingId),
  });

  const pingResult = useQuery({
    queryKey: ["health", "ping", pingId],
    queryFn: () =>
      apiClient.get<{ received: boolean; document: unknown }>(`/health/ping-worker/${pingId}`),
    enabled: Boolean(pingId),
    refetchInterval: (query) => (query.state.data?.received ? false : 1000),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">System Health</h1>
        <p className="text-sm text-slate-500">
          Phase 1 infrastructure check: web → api → Mongo/Redis, and api → BullMQ → worker → Mongo.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h2 className="text-sm font-medium">API readiness</h2>
        <div className="flex flex-wrap gap-2">
          <StatusPill label="mongo" ok={readiness.data?.checks?.mongo === "ok"} />
          <StatusPill label="redis" ok={readiness.data?.checks?.redis === "ok"} />
        </div>
        {readiness.isError && (
          <p className="text-sm text-red-600">
            Could not reach the API at all — is it running? See README for local setup.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h2 className="text-sm font-medium">BullMQ round trip</h2>
        <button
          type="button"
          onClick={() => enqueuePing.mutate()}
          disabled={enqueuePing.isPending}
          className="rounded-lg bg-primary text-white text-sm px-4 py-2 disabled:opacity-50"
        >
          {enqueuePing.isPending ? "Enqueuing..." : "Send health ping to worker"}
        </button>
        {pingId && (
          <p className="text-sm text-slate-500">
            ping <code>{pingId}</code>:{" "}
            {pingResult.data?.received ? "processed by worker ✅" : "waiting for worker..."}
          </p>
        )}
      </div>
    </div>
  );
}
