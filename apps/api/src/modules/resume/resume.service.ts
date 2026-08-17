import type { HydratedDocument } from "mongoose";
import { Resume, type ResumeDoc } from "@job-copilot/db";
import { LocalStorageProvider, createSignedDownloadToken } from "@job-copilot/storage";
import { createResumeParseQueue } from "@job-copilot/queue";
import type { Resume as ResumeDto } from "@job-copilot/shared";
import { ALLOWED_RESUME_MIME_TYPES, MAX_RESUME_SIZE_BYTES } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";
import { env } from "../../config/env.js";

const storage = new LocalStorageProvider(env.STORAGE_DIR);

// Bounds how long we'll wait for the resume-parse job to be enqueued before
// giving up and surfacing a failed status — see uploadResume() below.
const ENQUEUE_TIMEOUT_MS = 5000;

function toResumeDto(resume: HydratedDocument<ResumeDoc>): ResumeDto {
  return {
    id: String(resume._id),
    originalName: resume.originalName,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    isPrimary: resume.isPrimary,
    uploadStatus: resume.uploadStatus as ResumeDto["uploadStatus"],
    textExtractionStatus: resume.textExtractionStatus as ResumeDto["textExtractionStatus"],
    structureExtractionStatus:
      resume.structureExtractionStatus as ResumeDto["structureExtractionStatus"],
    confirmationStatus: resume.confirmationStatus as ResumeDto["confirmationStatus"],
    parseError: resume.parseError ?? undefined,
    rawText: resume.rawText ?? undefined,
    structuredData: resume.structuredData ?? undefined,
    userCorrections: resume.userCorrections ?? undefined,
    createdAt: resume.createdAt!.toISOString(),
    updatedAt: resume.updatedAt!.toISOString(),
  };
}

export async function uploadResume(
  userId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
): Promise<ResumeDto> {
  if (!ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_RESUME_MIME_TYPES)[number])) {
    throw ApiError.badRequest("Only PDF and DOCX files are supported.");
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw ApiError.badRequest("File is too large. Maximum size is 10MB.");
  }

  const saved = await storage.saveFile({
    buffer: file.buffer,
    userId,
    originalName: file.originalname,
  });

  const existingCount = await Resume.countDocuments({ userId, deletedAt: null });

  const resume = await Resume.create({
    userId,
    storageKey: saved.storageKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: saved.sizeBytes,
    sha256: saved.sha256,
    isPrimary: existingCount === 0, // first resume becomes primary automatically
    uploadStatus: "complete",
    textExtractionStatus: "pending",
  });

  // Text extraction runs as a background job (Phase 0 §30), not inline in
  // the request — keeps the upload response fast regardless of file size.
  // Deliberately NOT awaited: if Redis is slow or unreachable, the queue
  // client (maxRetriesPerRequest: null, required by BullMQ) retries forever
  // rather than rejecting quickly, so awaiting it here would hang the whole
  // upload request on Redis health. The resume is already saved; enqueueing
  // is a best-effort follow-up. If it doesn't succeed within ENQUEUE_TIMEOUT_MS
  // (including "never resolves because Redis is unreachable"), the record is
  // marked failed so the UI stops polling and shows an accurate status
  // instead of "pending" forever.
  const queue = createResumeParseQueue(env.REDIS_URL);
  const enqueue = queue.add("parse", {
    resumeId: String(resume._id),
    userId,
    storageKey: resume.storageKey,
    mimeType: resume.mimeType,
  });
  const enqueueTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timed out waiting to queue extraction job")), ENQUEUE_TIMEOUT_MS),
  );
  Promise.race([enqueue, enqueueTimeout]).catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : "Unknown queue error";
    await Resume.updateOne(
      { _id: resume._id },
      { $set: { textExtractionStatus: "failed", parseError: `Could not queue text extraction: ${message}` } },
    ).catch(() => undefined);
  });

  return toResumeDto(resume);
}

export async function listResumes(userId: string): Promise<ResumeDto[]> {
  const resumes = await Resume.find({ userId, deletedAt: null }).sort({ createdAt: -1 });
  return resumes.map(toResumeDto);
}

async function getOwnedResume(userId: string, resumeId: string): Promise<HydratedDocument<ResumeDoc>> {
  const resume = await Resume.findOne({ _id: resumeId, userId, deletedAt: null });
  if (!resume) throw ApiError.notFound("Resume not found");
  return resume;
}

export async function getResume(userId: string, resumeId: string): Promise<ResumeDto> {
  const resume = await getOwnedResume(userId, resumeId);
  return toResumeDto(resume);
}

export async function deleteResume(userId: string, resumeId: string): Promise<void> {
  const resume = await getOwnedResume(userId, resumeId);
  // Soft delete per Phase 0 amendment #17 — candidate-owned history isn't
  // hard-deleted. The underlying file is removed since it's no longer
  // needed and may contain sensitive PII; the metadata row stays.
  resume.deletedAt = new Date();
  await resume.save();
  await storage.deleteFile(resume.storageKey).catch(() => undefined);

  if (resume.isPrimary) {
    const nextPrimary = await Resume.findOne({ userId, deletedAt: null }).sort({ createdAt: -1 });
    if (nextPrimary) {
      nextPrimary.isPrimary = true;
      await nextPrimary.save();
    }
  }
}

export async function setPrimaryResume(userId: string, resumeId: string): Promise<ResumeDto> {
  const resume = await getOwnedResume(userId, resumeId);
  await Resume.updateMany({ userId, deletedAt: null }, { $set: { isPrimary: false } });
  resume.isPrimary = true;
  await resume.save();
  return toResumeDto(resume);
}

export async function saveUserCorrections(
  userId: string,
  resumeId: string,
  userCorrections: Record<string, unknown>,
): Promise<ResumeDto> {
  const resume = await getOwnedResume(userId, resumeId);
  // Corrections are layered on top, never overwrite structuredData itself —
  // AI-extracted data (Phase 8) must never be silently replaced, and the
  // user's corrections must never be silently discarded either.
  resume.userCorrections = { ...(resume.userCorrections as object | undefined), ...userCorrections };
  resume.confirmationStatus = "complete";
  await resume.save();
  return toResumeDto(resume);
}

export async function getSignedDownloadUrl(
  userId: string,
  resumeId: string,
): Promise<{ url: string; expiresAt: number }> {
  const resume = await getOwnedResume(userId, resumeId);
  const { token, expiresAt } = createSignedDownloadToken(
    resume.storageKey,
    env.SIGNED_URL_SECRET,
    env.SIGNED_URL_TTL_SECONDS,
  );
  return { url: `/resumes/${resumeId}/download?token=${token}`, expiresAt };
}

export async function getResumeMetaById(
  resumeId: string,
): Promise<{ storageKey: string; mimeType: string; originalName: string } | null> {
  const resume = await Resume.findOne({ _id: resumeId, deletedAt: null });
  if (!resume) return null;
  return { storageKey: resume.storageKey, mimeType: resume.mimeType, originalName: resume.originalName };
}

export { storage };
