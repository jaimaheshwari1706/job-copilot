import { useEffect, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import type { CoverLetterDto } from "@job-copilot/shared";
import { ApiRequestError } from "../../lib/api-client";
import { useAiStatus, useCoverLetter, useGenerateCoverLetter, useUpdateCoverLetter } from "./ai.api";

const TONES: { value: CoverLetterDto["tone"]; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "concise", label: "Concise" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
];

export function CoverLetterSection({ jobId }: { jobId: string }) {
  const { data: aiStatus } = useAiStatus();
  const { data: existing, isLoading } = useCoverLetter(jobId);
  const generate = useGenerateCoverLetter();
  const update = useUpdateCoverLetter();

  const [tone, setTone] = useState<CoverLetterDto["tone"]>("professional");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (existing) {
      setDraft(existing.content);
      setTone(existing.tone);
    }
  }, [existing]);

  const letter = generate.data ?? existing;
  const isDirty = letter ? draft !== letter.content : false;

  if (isLoading) return null;

  if (aiStatus && !aiStatus.configured) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium mb-2">Cover Letter</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          AI features aren't configured on this server, so cover letter generation isn't available
          right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Cover Letter</h2>
        <div className="flex items-center gap-2">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as CoverLetterDto["tone"])}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none"
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => generate.mutate({ jobId, tone })}
            disabled={generate.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-solid text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            <Sparkles size={12} />
            {generate.isPending ? "Generating..." : letter ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {generate.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {generate.error instanceof ApiRequestError ? generate.error.message : "Something went wrong."}
        </p>
      )}

      {letter && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {letter.userEdited ? "Edited by you" : "AI-generated"} · {new Date(letter.generatedAt).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={() => update.mutate({ id: letter.id, content: draft })}
              disabled={!isDirty || update.isPending}
              className="rounded-lg border border-border text-xs font-medium px-3 py-1.5 disabled:opacity-40"
            >
              {update.isPending ? "Saving..." : "Save edits"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
