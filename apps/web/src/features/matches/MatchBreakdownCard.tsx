import type { Match } from "@job-copilot/shared";
import { useMatch } from "./matches.api";

const CATEGORY_LABELS: Record<keyof Match["breakdown"], string> = {
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  role: "Role fit",
  education: "Education",
  preferences: "Preferences",
};

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function MatchBreakdownCard({ jobId }: { jobId: string }) {
  const { data: match, isLoading } = useMatch(jobId);

  if (isLoading) return <p className="text-sm text-slate-500">Calculating match...</p>;
  if (!match) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold">{match.overallScore}%</p>
          <p className="text-xs text-slate-500">
            Confidence: {confidenceLabel(match.confidence)} ({Math.round(match.confidence * 100)}%)
          </p>
        </div>
      </div>

      {match.confidence < 0.6 && (
        <p className="text-xs text-slate-400 bg-surface-muted rounded-lg p-2.5">
          This job listing or your profile is missing information the matcher would normally use
          (e.g. project history, education, or a detailed job description) — treat this score as a
          rough estimate rather than a precise ranking.
        </p>
      )}

      <div className="space-y-3">
        {(Object.keys(CATEGORY_LABELS) as Array<keyof Match["breakdown"]>).map((key) => (
          <ScoreBar key={key} label={CATEGORY_LABELS[key]} value={match.breakdown[key]} />
        ))}
      </div>

      {match.penalties.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Why this scored lower</p>
          <ul className="space-y-1">
            {match.penalties.map((p, i) => (
              <li key={i} className="text-xs text-red-600">
                • {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.matchedSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Matched skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.matchedSkills.map((s) => (
              <span
                key={s}
                className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.missingRequiredSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Missing required skills</p>
          <div className="flex flex-wrap gap-1.5">
            {match.missingRequiredSkills.map((s) => (
              <span
                key={s}
                className="rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs px-2 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
