import { TrendingUp, CheckCircle2 } from "lucide-react";
import { useSkillGapAnalysis } from "./skills.api";

function DemandBar({ label, percentage, jobsUnlocked }: { label: string; percentage: number; jobsUnlocked?: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{percentage}% of relevant jobs</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      {jobsUnlocked !== undefined && jobsUnlocked > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Would unlock {jobsUnlocked} more job{jobsUnlocked === 1 ? "" : "s"} you're otherwise qualified for
        </p>
      )}
    </div>
  );
}

export function SkillsPage() {
  const { data, isLoading } = useSkillGapAnalysis();

  if (isLoading) return <p className="text-sm text-slate-500">Analyzing your skills against the job market...</p>;
  if (!data) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Skill Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Calculated from {data.totalRelevantJobs} job{data.totalRelevantJobs === 1 ? "" : "s"} you're a
          reasonable match for — not AI-guessed, counted directly from real job requirements.
        </p>
      </div>

      {data.totalRelevantJobs === 0 ? (
        <p className="text-sm text-slate-500">
          No relevant jobs found yet to analyze against. Browse and save some jobs, or complete your
          profile to improve matching.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
            <h2 className="text-sm font-medium flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" /> Your skills in demand
            </h2>
            {data.existingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.existingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">None of your current skills appear in relevant jobs yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <h2 className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp size={15} className="text-primary" /> Best skills to learn next
            </h2>
            {data.topMissingSkills.length > 0 ? (
              <div className="space-y-4">
                {data.topMissingSkills.map((skill) => (
                  <DemandBar
                    key={skill.skill}
                    label={skill.skill}
                    percentage={skill.demandPercentage}
                    jobsUnlocked={skill.jobsUnlocked}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                You already have every skill that appears across your relevant jobs.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
