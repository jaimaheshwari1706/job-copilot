import { useMatch } from "./matches.api";

function tierStyle(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (score >= 80) return "bg-primary/10 text-primary";
  if (score >= 70) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}

export function MatchBadge({ jobId }: { jobId: string }) {
  const { data: match, isLoading } = useMatch(jobId);

  if (isLoading || !match) {
    return <span className="text-xs text-slate-400">Match: —</span>;
  }

  return (
    <span
      title={`Confidence: ${Math.round(match.confidence * 100)}%`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tierStyle(match.overallScore)}`}
    >
      {match.overallScore}% match
    </span>
  );
}
