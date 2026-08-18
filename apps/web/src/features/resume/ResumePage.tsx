import { useRef, useState } from "react";
import { UploadCloud, Star, Download, Trash2, FileText, AlertCircle } from "lucide-react";
import type { Resume } from "@job-copilot/shared";
import { ApiRequestError } from "../../lib/api-client";
import { StatusPill } from "./StatusPill";
import {
  useResumes,
  useUploadResume,
  useDeleteResume,
  useSetPrimaryResume,
  useResumeDownloadUrl,
} from "./resume.api";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResumeRow({ resume }: { resume: Resume }) {
  const [expanded, setExpanded] = useState(false);
  const deleteResume = useDeleteResume();
  const setPrimary = useSetPrimaryResume();
  const downloadUrl = useResumeDownloadUrl();

  async function handleDownload() {
    const result = await downloadUrl.mutateAsync(resume.id);
    window.open(`${API_BASE_URL}${result.url}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-4">
        <FileText size={20} className="text-slate-500 dark:text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-medium truncate hover:text-primary"
            >
              {resume.originalName}
            </button>
            {resume.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                <Star size={10} fill="currentColor" /> Primary
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatSize(resume.sizeBytes)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={resume.textExtractionStatus} />
          {!resume.isPrimary && (
            <button
              type="button"
              onClick={() => setPrimary.mutate(resume.id)}
              disabled={setPrimary.isPending}
              title="Set as primary"
              className="p-1.5 rounded-lg hover:bg-surface-muted text-slate-500 dark:text-slate-400"
            >
              <Star size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadUrl.isPending}
            title="Download"
            className="p-1.5 rounded-lg hover:bg-surface-muted text-slate-500 dark:text-slate-400"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            onClick={() => deleteResume.mutate(resume.id)}
            disabled={deleteResume.isPending}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Text extraction: <StatusPill status={resume.textExtractionStatus} /></span>
            <span>Structured data: <StatusPill status={resume.structureExtractionStatus} /></span>
          </div>

          {resume.structureExtractionStatus === "not_started" && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle size={13} />
              AI-powered structured extraction (skills, employment history, education) ships in a
              later phase. Extracted plain text is available below in the meantime.
            </p>
          )}

          {resume.textExtractionStatus === "failed" && resume.parseError && (
            <p className="text-xs text-red-600 dark:text-red-400">Extraction failed: {resume.parseError}</p>
          )}

          {resume.textExtractionStatus === "complete" && resume.rawText && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Extracted text preview</p>
              <pre className="text-xs bg-surface-muted rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                {resume.rawText.slice(0, 2000)}
                {resume.rawText.length > 2000 ? "…" : ""}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResumePage() {
  const { data: resumes, isLoading } = useResumes();
  const uploadResume = useUploadResume();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) uploadResume.mutate(file);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Resume</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload a PDF or DOCX resume. Text extraction runs automatically in the background.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-surface-muted"
        }`}
      >
        <UploadCloud size={28} className="mx-auto text-slate-500 dark:text-slate-400 mb-2" />
        <p className="text-sm">
          <span className="text-primary font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF or DOCX, up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploadResume.isPending && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Uploading...</p>
      )}
      {uploadResume.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {uploadResume.error instanceof ApiRequestError
            ? uploadResume.error.message
            : "Upload failed."}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading resumes...</p>
      ) : resumes && resumes.length > 0 ? (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <ResumeRow key={resume.id} resume={resume} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No resumes uploaded yet.</p>
      )}
    </div>
  );
}
