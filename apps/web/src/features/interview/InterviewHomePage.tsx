import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, MessagesSquare, AlertCircle } from "lucide-react";
import type { InterviewQuestionCategory } from "@job-copilot/shared";
import { ApiRequestError } from "../../lib/api-client";
import { useAiStatus } from "../ai/ai.api";
import { useInterviewSessions, useStartPrepSession, useStartMockSession } from "./interview.api";

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

export function InterviewHomePage() {
  const navigate = useNavigate();
  const { data: aiStatus } = useAiStatus();
  const { data: sessions, isLoading } = useInterviewSessions();
  const startPrep = useStartPrepSession();
  const startMock = useStartMockSession();
  const [selectedCategories, setSelectedCategories] = useState<InterviewQuestionCategory[]>([]);

  function toggleCategory(cat: InterviewQuestionCategory) {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleStartPrep() {
    const session = await startPrep.mutateAsync({
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    });
    navigate(`/interview/session/${session.id}`);
  }

  async function handleStartMock() {
    const session = await startMock.mutateAsync({});
    navigate(`/interview/session/${session.id}`);
  }

  const disabled = aiStatus && !aiStatus.configured;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Interview Preparation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Generate practice questions, or run a mock interview with feedback on each answer.
        </p>
      </div>

      {disabled && (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-surface-muted rounded-lg p-2.5 flex items-start gap-1.5">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          AI features aren't configured on this server, so interview prep and mock interviews aren't
          available right now.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen size={16} className="text-primary" /> Prep Questions
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate a set of questions across categories to review.</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as InterviewQuestionCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-2.5 py-1 text-xs border ${
                  selectedCategories.includes(cat)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-slate-500 dark:text-slate-400"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleStartPrep}
            disabled={disabled || startPrep.isPending}
            className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {startPrep.isPending ? "Generating..." : "Generate questions"}
          </button>
          {startPrep.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {startPrep.error instanceof ApiRequestError ? startPrep.error.message : "Something went wrong."}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessagesSquare size={16} className="text-primary" /> Mock Interview
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Answer one question at a time and get feedback with a follow-up question, up to 5 rounds.
          </p>
          <button
            type="button"
            onClick={handleStartMock}
            disabled={disabled || startMock.isPending}
            className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2 disabled:opacity-50 mt-auto"
          >
            {startMock.isPending ? "Starting..." : "Start mock interview"}
          </button>
          {startMock.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {startMock.error instanceof ApiRequestError ? startMock.error.message : "Something went wrong."}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Past sessions</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={`/interview/session/${session.id}`}
                className="block rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40"
              >
                <div className="flex justify-between">
                  <span className="font-medium capitalize">
                    {session.type === "prep" ? "Prep questions" : "Mock interview"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {session.questions.length} question{session.questions.length === 1 ? "" : "s"} ·{" "}
                  {session.status}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
