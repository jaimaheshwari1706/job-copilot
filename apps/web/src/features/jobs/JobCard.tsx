import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, EyeOff, MapPin, Briefcase } from "lucide-react";
import type { Job } from "@job-copilot/shared";
import { useSaveJob, useHideJob, useUnsaveJob } from "./jobs.api";
import { MatchBadge } from "../matches/MatchBadge";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

const WORK_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export function JobCard({ job }: { job: Job }) {
  const saveJob = useSaveJob();
  const hideJob = useHideJob();
  const unsaveJob = useUnsaveJob();

  const isSaved = job.savedStatus === "saved";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/jobs/${job.id}`} className="text-sm font-semibold hover:text-primary truncate block">
            {job.title}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{job.company}</p>
            <MatchBadge jobId={job.id} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => (isSaved ? unsaveJob.mutate(job.id) : saveJob.mutate(job.id))}
            title={isSaved ? "Unsave" : "Save"}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-slate-500 dark:text-slate-400"
          >
            {isSaved ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
          </button>
          <button
            type="button"
            onClick={() => hideJob.mutate(job.id)}
            title="Not interested"
            className="p-1.5 rounded-lg hover:bg-surface-muted text-slate-500 dark:text-slate-400"
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {job.location}
          </span>
        )}
        {job.workMode && (
          <span className="inline-flex items-center gap-1">
            <Briefcase size={12} /> {WORK_MODE_LABEL[job.workMode]}
          </span>
        )}
        {job.experienceMin !== undefined && (
          <span>
            {job.experienceMin}
            {job.experienceMax ? `–${job.experienceMax}` : "+"} yrs
          </span>
        )}
        <span>{timeAgo(job.postedAt)}</span>
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-surface-muted text-xs px-2 py-0.5 text-slate-600 dark:text-slate-300"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary font-medium hover:underline"
        >
          Apply →
        </a>
      </div>
    </div>
  );
}
