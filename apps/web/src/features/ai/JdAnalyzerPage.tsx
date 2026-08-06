import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { ApiRequestError } from "../../lib/api-client";
import { useAiStatus, useAnalyzeJobDescription } from "./ai.api";

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

export function JdAnalyzerPage() {
  const [text, setText] = useState("");
  const { data: aiStatus } = useAiStatus();
  const analyze = useAnalyzeJobDescription();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze.mutate({ jobDescriptionText: text });
  };

  const result = analyze.data;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Analyze a Job Description</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste a job posting from anywhere — LinkedIn, a company site, an email — to see how well it
          matches your profile.
        </p>
      </div>

      {aiStatus && !aiStatus.configured && (
        <p className="text-xs text-slate-400 bg-surface-muted rounded-lg p-2.5 flex items-start gap-1.5">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          AI commentary isn't configured on this server — you'll still get the full deterministic
          match breakdown below, just without AI-written strengths/weaknesses/suggestions.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste the full job description here..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {text.length > 0 && text.trim().length < 50 && (
          <p className="text-xs text-red-600">Paste at least 50 characters.</p>
        )}
        <button
          type="submit"
          disabled={analyze.isPending || text.trim().length < 50}
          className="rounded-lg bg-primary-solid text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
        >
          {analyze.isPending ? "Analyzing..." : "Analyze"}
        </button>
        {analyze.isError && (
          <p className="text-sm text-red-600">
            {analyze.error instanceof ApiRequestError ? analyze.error.message : "Something went wrong."}
          </p>
        )}
      </form>

      {result && (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          <div>
            <p className="text-2xl font-semibold">{result.overallScore}%</p>
            <p className="text-xs text-slate-500">Confidence: {Math.round(result.confidence * 100)}%</p>
          </div>

          <div className="space-y-3">
            <ScoreBar label="Skills" value={result.breakdown.skills} />
            <ScoreBar label="Experience" value={result.breakdown.experience} />
            <ScoreBar label="Role fit" value={result.breakdown.role} />
            <ScoreBar label="Preferences" value={result.breakdown.preferences} />
          </div>

          {result.matchedSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Matched skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedSkills.map((s) => (
                  <span key={s} className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missingRequiredSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Missing skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingRequiredSkills.map((s) => (
                  <span key={s} className="rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.aiAvailable && result.aiCommentary ? (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles size={13} /> AI commentary
              </div>
              {(["strengths", "weaknesses", "suggestions"] as const).map((key) =>
                result.aiCommentary![key].length > 0 ? (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-500 mb-1 capitalize">{key}</p>
                    <ul className="list-disc list-inside space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {result.aiCommentary![key].map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 pt-2 border-t border-border">
              AI commentary unavailable — showing the deterministic match analysis only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
