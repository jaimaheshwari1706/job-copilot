import { Router } from "express";
import multer from "multer";
import { verifySignedDownloadToken } from "@job-copilot/storage";
import { resumeCorrectionsSchema, MAX_RESUME_SIZE_BYTES, type ApiSuccess, type Resume as ResumeDto } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { ApiError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import * as resumeService from "./resume.service.js";

export const resumeRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_SIZE_BYTES },
});

/**
 * Streams the actual file. Deliberately mounted BEFORE requireAuth: a
 * signed download URL is meant to be usable as a plain link (window.open,
 * <a href>, sharing) which cannot carry an Authorization header. The
 * short-lived, single-resume-scoped signed token IS the authorization here
 * — the same pattern S3 presigned URLs use. Every other route in this
 * router still requires a full session.
 */
resumeRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (typeof token !== "string") throw ApiError.badRequest("Missing download token");

    const verification = verifySignedDownloadToken(token, env.SIGNED_URL_SECRET);
    if (!verification.valid) throw ApiError.unauthorized(verification.reason);

    const resume = await resumeService.getResumeMetaById(req.params.id!);
    if (!resume) throw ApiError.notFound("Resume not found");
    if (resume.storageKey !== verification.storageKey) {
      // Token was validly signed but for a different resume's storage key —
      // reject rather than silently serving the wrong file.
      throw ApiError.unauthorized("Token does not match this resume");
    }

    const fileBuffer = await resumeService.storage.readFile(resume.storageKey);
    res.setHeader("Content-Type", resume.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${resume.originalName}"`);
    res.send(fileBuffer);
  }),
);

resumeRouter.use(requireAuth);

resumeRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file uploaded (expected field name 'file').");
    const resume = await resumeService.uploadResume(req.user!.id, req.file);
    const body: ApiSuccess<ResumeDto> = { success: true, data: resume };
    res.status(201).json(body);
  }),
);

resumeRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const resumes = await resumeService.listResumes(req.user!.id);
    const body: ApiSuccess<ResumeDto[]> = { success: true, data: resumes };
    res.json(body);
  }),
);

resumeRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const resume = await resumeService.getResume(req.user!.id, req.params.id!);
    const body: ApiSuccess<ResumeDto> = { success: true, data: resume };
    res.json(body);
  }),
);

resumeRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await resumeService.deleteResume(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ deleted: true }> = { success: true, data: { deleted: true } };
    res.json(body);
  }),
);

resumeRouter.post(
  "/:id/set-primary",
  asyncHandler(async (req, res) => {
    const resume = await resumeService.setPrimaryResume(req.user!.id, req.params.id!);
    const body: ApiSuccess<ResumeDto> = { success: true, data: resume };
    res.json(body);
  }),
);

resumeRouter.patch(
  "/:id/corrections",
  validateBody(resumeCorrectionsSchema),
  asyncHandler(async (req, res) => {
    const resume = await resumeService.saveUserCorrections(
      req.user!.id,
      req.params.id!,
      req.body.userCorrections,
    );
    const body: ApiSuccess<ResumeDto> = { success: true, data: resume };
    res.json(body);
  }),
);

/** Returns a short-lived signed download URL rather than the file directly. */
resumeRouter.get(
  "/:id/download-url",
  asyncHandler(async (req, res) => {
    const result = await resumeService.getSignedDownloadUrl(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ url: string; expiresAt: number }> = { success: true, data: result };
    res.json(body);
  }),
);
