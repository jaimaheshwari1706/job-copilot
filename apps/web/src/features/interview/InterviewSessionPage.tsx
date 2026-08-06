import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { InterviewQuestionCategory } from "@job-copilot/shared";
import { ApiRequestError } from "../../lib/api-client";
import { useInterviewSession, useSubmitMockAnswer } from "./interview.api";

const CATEGORY_LABELS: Record<InterviewQuestionCategory, string> = {
  javascript: "JavaScript",
  react: "React",
  nodejs: "Node.js",
  database: "Database",
  apis: "APIs",
  testing: "Testing",
  system_design: "System Design",
  behavioral: "Behavioral",
  project_specific: "Project-specific",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "Low confidence — this evaluation is inherently subjective",
  medium: "Medium confidence",
  high: "High confidence",
};

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading } = useInterviewSession(id);
  const submitAnswer = useSubmitMockAnswer();
  const [draft, setDraft] = useState("");

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (!session) return <p className="text-sm text-slate-500">Session not found.</p>;

  const lastQuestion = session.questions[session.questions.length - 1];
  const awaitingAnswer = session.type === "mock" && session.status === "active" && lastQuestion && !lastQuestion.userAnswer;

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/interview" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={14} /> Back to interview prep
      </Link>

      <div>
        <h1 className="text-lg font-semibold capitalize">
          {session.type === "prep" ? "Prep Questions" : "Mock Interview"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {session.status === "completed" ? "Completed" : "In progress"} · {session.questions.length} question
          {session.questions.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-4">
        {session.questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[q.category]}
              </span>
            </div>
            <p className="text-sm font-medium">{q.question}</p>

            {q.userAnswer && (
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-xs text-slate-500 mb-1">Your answer</p>
                <p className="text-sm whitespace-pre-line">{q.userAnswer}</p>
              </div>
            )}

            {q.evaluation && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{q.evaluation.score}/100</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <HelpCircle size={12} /> {CONFIDENCE_LABEL[q.evaluation.confidence]}
                  </span>
                </div>
                {q.evaluation.strengths.length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Strengths
                    </p>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {q.evaluation.strengths.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {q.evaluation.missingConcepts.length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <XCircle size={12} className="text-amber-500" /> Missing concepts
                    </p>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
                      {q.evaluation.missingConcepts.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {q.evaluation.betterAnswerStructure && (
                  <div className="text-sm">
                    <p className="text-xs font-medium text-slate-500 mb-1">A stronger answer would...</p>
                    <p className="text-slate-600 dark:text-slate-300">{q.evaluation.betterAnswerStructure}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {awaitingAnswer && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <p className="text-sm font-medium">Your answer</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={() => id && draft.trim() && submitAnswer.mutate({ sessionId: id, answer: draft.trim() }, { onSuccess: () => setDraft("") })}
            disabled={!draft.trim() || submitAnswer.isPending}
            className="rounded-lg bg-primary-solid text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
          >
            {submitAnswer.isPending ? "Evaluating..." : "Submit answer"}
          </button>
          {submitAnswer.isError && (
            <p className="text-sm text-red-600">
              {submitAnswer.error instanceof ApiRequestError ? submitAnswer.error.message : "Something went wrong."}
            </p>
          )}
        </div>
      )}

      {session.type === "mock" && session.status === "completed" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Mock interview complete.</p>
      )}
    </div>
  );
}
