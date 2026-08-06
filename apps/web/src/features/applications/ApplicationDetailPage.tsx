import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from "@job-copilot/shared";
import {
  useApplication,
  useApplicationEvents,
  useApplicationNotes,
  useUpdateApplication,
  useAddApplicationNote,
} from "./applications.api";

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading } = useApplication(id);
  const { data: events } = useApplicationEvents(id);
  const { data: notes } = useApplicationNotes(id);
  const updateApplication = useUpdateApplication();
  const addNote = useAddApplicationNote();
  const [noteDraft, setNoteDraft] = useState("");

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (!app) return <p className="text-sm text-slate-500">Application not found.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={14} /> Back to applications
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{app.jobSnapshot.title}</h1>
            <p className="text-sm text-slate-500">{app.jobSnapshot.company}</p>
          </div>
          <select
            value={app.status}
            onChange={(e) => id && updateApplication.mutate({ id, status: e.target.value as ApplicationStatus })}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none"
          >
            {APPLICATION_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        {app.jobSnapshot.applyUrl && (
          <a
            href={app.jobSnapshot.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View original posting →
          </a>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
        <h2 className="text-sm font-medium">Timeline</h2>
        {events && events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="text-sm text-slate-600 dark:text-slate-300 flex justify-between">
                <span>
                  {event.type === "status_change"
                    ? `${event.fromStatus} → ${event.toStatus}`
                    : event.type === "interview_scheduled"
                      ? "Interview scheduled"
                      : "Application created"}
                </span>
                <span className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No events yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
        <h2 className="text-sm font-medium">Notes</h2>
        {notes && notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="text-sm bg-surface-muted rounded-lg p-2.5">
                <p>{note.content}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (id && noteDraft.trim()) {
              addNote.mutate({ id, content: noteDraft.trim() }, { onSuccess: () => setNoteDraft("") });
            }
          }}
          className="flex gap-2"
        >
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!noteDraft.trim() || addNote.isPending}
            className="rounded-lg bg-primary-solid text-white text-sm px-4 py-2 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
