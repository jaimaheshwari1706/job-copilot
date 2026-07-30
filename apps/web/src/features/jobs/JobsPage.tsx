import { useState } from "react";
import { Search } from "lucide-react";
import type { JobSearchQuery } from "@job-copilot/shared";
import { JobCard } from "./JobCard";
import { useJobSearch } from "./jobs.api";

const WORK_MODES: { value: JobSearchQuery["workMode"] | ""; label: string }[] = [
  { value: "", label: "Any work mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export function JobsPage() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<JobSearchQuery["workMode"] | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useJobSearch({
    keywords: keywords || undefined,
    location: location || undefined,
    workMode: workMode || undefined,
    page,
    limit: 10,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Discover Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">
          {data ? `${data.total} job${data.total === 1 ? "" : "s"} found` : "Search for roles"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={keywords}
            onChange={(e) => {
              setKeywords(e.target.value);
              setPage(1);
            }}
            placeholder="Title or skill..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
          placeholder="Location"
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none min-w-[140px]"
        />
        <select
          value={workMode}
          onChange={(e) => {
            setWorkMode(e.target.value as JobSearchQuery["workMode"] | "");
            setPage(1);
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none bg-surface"
        >
          {WORK_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading jobs...</p>
      ) : data && data.jobs.length > 0 ? (
        <>
          <div className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">No jobs match your search.</p>
      )}
    </div>
  );
}
