import { Router } from "express";
import {
  startPrepSessionSchema,
  startMockSessionSchema,
  submitAnswerSchema,
  type ApiSuccess,
  type InterviewSessionDto,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { ApiError } from "../../lib/errors.js";
import * as interviewService from "./interview.service.js";

export const interviewRouter = Router();
interviewRouter.use(requireAuth);

interviewRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const sessions = await interviewService.listSessions(req.user!.id);
    const body: ApiSuccess<InterviewSessionDto[]> = { success: true, data: sessions };
    res.json(body);
  }),
);

interviewRouter.post(
  "/prep",
  validateBody(startPrepSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await interviewService.startPrepSession(req.user!.id, req.body);
    const body: ApiSuccess<InterviewSessionDto> = { success: true, data: session };
    res.status(201).json(body);
  }),
);

interviewRouter.post(
  "/mock/start",
  validateBody(startMockSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await interviewService.startMockSession(req.user!.id, req.body);
    const body: ApiSuccess<InterviewSessionDto> = { success: true, data: session };
    res.status(201).json(body);
  }),
);

interviewRouter.post(
  "/mock/:sessionId/answer",
  validateBody(submitAnswerSchema),
  asyncHandler(async (req, res) => {
    if (!req.params.sessionId) throw ApiError.badRequest("Missing session id");
    const session = await interviewService.submitMockAnswer(
      req.user!.id,
      req.params.sessionId,
      req.body.answer,
    );
    const body: ApiSuccess<InterviewSessionDto> = { success: true, data: session };
    res.json(body);
  }),
);

interviewRouter.get(
  "/session/:id",
  asyncHandler(async (req, res) => {
    const session = await interviewService.getSession(req.user!.id, req.params.id!);
    const body: ApiSuccess<InterviewSessionDto> = { success: true, data: session };
    res.json(body);
  }),
);
