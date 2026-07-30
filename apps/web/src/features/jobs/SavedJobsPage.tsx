import { Link } from "react-router-dom";
import { JobCard } from "./JobCard";
import { useSavedJobs } from "./jobs.api";

export function SavedJobsPage() {
  const { data: jobs, isLoading } = useSavedJobs();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Saved Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">
          {jobs ? `${jobs.length} saved job${jobs.length === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : jobs && jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No saved jobs yet — browse{" "}
          <Link to="/jobs" className="text-primary hover:underline">
            open roles
          </Link>{" "}
          and save the ones you're interested in.
        </p>
      )}
    </div>
  );
}
