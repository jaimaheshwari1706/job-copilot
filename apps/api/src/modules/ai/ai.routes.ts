import { Router } from "express";
import {
  jdAnalysisRequestSchema,
  generateCoverLetterRequestSchema,
  updateCoverLetterSchema,
  type ApiSuccess,
  type JdAnalysisResult,
  type CoverLetterDto,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { ApiError } from "../../lib/errors.js";
import { isAiConfigured } from "./ai-provider.factory.js";
import * as jdAnalyzer from "./jd-analyzer.service.js";
import * as coverLetterService from "./cover-letter.service.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

/** Lets the frontend show/hide AI-dependent UI without guessing from a failed call. */
aiRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const body: ApiSuccess<{ configured: boolean }> = {
      success: true,
      data: { configured: isAiConfigured() },
    };
    res.json(body);
  }),
);

aiRouter.post(
  "/analyze-job-description",
  validateBody(jdAnalysisRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await jdAnalyzer.analyzeJobDescription(req.user!.id, req.body.jobDescriptionText);
    const body: ApiSuccess<JdAnalysisResult> = { success: true, data: result };
    res.json(body);
  }),
);

aiRouter.post(
  "/cover-letter",
  validateBody(generateCoverLetterRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await coverLetterService.generateCoverLetter(req.user!.id, req.body);
    const body: ApiSuccess<CoverLetterDto> = { success: true, data: result };
    res.status(201).json(body);
  }),
);

aiRouter.get(
  "/cover-letter/:jobId",
  asyncHandler(async (req, res) => {
    const result = await coverLetterService.getLatestCoverLetter(req.user!.id, req.params.jobId!);
    const body: ApiSuccess<CoverLetterDto | null> = { success: true, data: result };
    res.json(body);
  }),
);

aiRouter.patch(
  "/cover-letter/:id",
  validateBody(updateCoverLetterSchema),
  asyncHandler(async (req, res) => {
    if (!req.params.id) throw ApiError.badRequest("Missing cover letter id");
    const result = await coverLetterService.updateCoverLetter(req.user!.id, req.params.id, req.body.content);
    const body: ApiSuccess<CoverLetterDto> = { success: true, data: result };
    res.json(body);
  }),
);
