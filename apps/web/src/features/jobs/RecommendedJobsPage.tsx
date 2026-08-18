import { useState } from "react";
import { JobCard } from "./JobCard";
import { useRecommendedJobs } from "./jobs.api";

type ScoreFilter = "any" | 80 | 90;

export function RecommendedJobsPage() {
  const [minScore, setMinScore] = useState<ScoreFilter>("any");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);

  const { data, isLoading, isFetching } = useRecommendedJobs({
    minScore: minScore === "any" ? undefined : minScore,
    workMode: remoteOnly ? "remote" : undefined,
    recentDays: recentOnly ? 7 : undefined,
    limit: 20,
  });

  const filterChip = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-slate-600 dark:text-slate-300 hover:bg-surface-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Recommended Jobs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {data ? `${data.total} job${data.total === 1 ? "" : "s"} ranked by match` : "Ranked by fit for your profile"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterChip(minScore === "any", "All matches", () => setMinScore("any"))}
        {filterChip(minScore === 80, "80%+", () => setMinScore(80))}
        {filterChip(minScore === 90, "90%+", () => setMinScore(90))}
        {filterChip(remoteOnly, "Remote", () => setRemoteOnly((v) => !v))}
        {filterChip(recentOnly, "Recently posted", () => setRecentOnly((v) => !v))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Ranking jobs for you...</p>
      ) : data && data.jobs.length > 0 ? (
        <div className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {data.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No jobs match these filters yet. Complete your profile and skills to improve recommendations.
        </p>
      )}
    </div>
  );
}
