import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkCheck, EyeOff, MapPin, Briefcase, Wallet } from "lucide-react";
import { useJob, useSaveJob, useHideJob, useUnsaveJob } from "./jobs.api";
import { MatchBreakdownCard } from "../matches/MatchBreakdownCard";
import { CoverLetterSection } from "../ai/CoverLetterSection";
import { useCreateApplication } from "../applications/applications.api";

const WORK_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-medium mb-2">{title}</h2>
      <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const saveJob = useSaveJob();
  const hideJob = useHideJob();
  const unsaveJob = useUnsaveJob();
  const createApplication = useCreateApplication();

  if (isLoading) return <p className="text-sm text-slate-500">Loading job...</p>;
  if (!job) return <p className="text-sm text-slate-500">Job not found.</p>;

  const isSaved = job.savedStatus === "saved";

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={14} /> Back to jobs
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{job.title}</h1>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => (isSaved ? unsaveJob.mutate(job.id) : saveJob.mutate(job.id))}
              className="p-2 rounded-lg border border-border hover:bg-surface-muted text-slate-500"
              title={isSaved ? "Unsave" : "Save"}
            >
              {isSaved ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} />}
            </button>
            <button
              type="button"
              onClick={() => hideJob.mutate(job.id)}
              className="p-2 rounded-lg border border-border hover:bg-surface-muted text-slate-500"
              title="Not interested"
            >
              <EyeOff size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
          {job.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {job.location}
            </span>
          )}
          {job.workMode && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={14} /> {WORK_MODE_LABEL[job.workMode]}
            </span>
          )}
          {job.salaryMin && (
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={14} />
              {job.salaryCurrency} {job.salaryMin.toLocaleString()}
              {job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : ""}
            </span>
          )}
        </div>

        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <span key={skill} className="rounded-md bg-surface-muted text-xs px-2 py-1">
                {skill}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            createApplication.mutate({ jobId: job.id, status: "applied" });
            window.open(job.applyUrl, "_blank", "noopener,noreferrer");
          }}
          className="inline-block rounded-lg bg-primary-solid text-white text-sm font-medium px-5 py-2.5"
        >
          Apply on company site →
        </button>
        {createApplication.isSuccess && (
          <p className="text-xs text-slate-400 mt-2">
            Added to your{" "}
            <Link to="/applications" className="text-primary hover:underline">
              applications tracker
            </Link>
            .
          </p>
        )}
      </div>

      <MatchBreakdownCard jobId={job.id} />
      <CoverLetterSection jobId={job.id} />

      <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-sm font-medium mb-2">About this role</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{job.description}</p>
        </div>
        <Section title="Responsibilities" items={job.responsibilities} />
        <Section title="Requirements" items={job.requirements} />
        <Section title="Preferred qualifications" items={job.preferredQualifications} />
      </div>
    </div>
  );
}
