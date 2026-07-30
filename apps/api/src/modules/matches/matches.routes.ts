import { Router } from "express";
import type { ApiSuccess, Match as MatchDto } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import * as matchesService from "./matches.service.js";

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

matchesRouter.get(
  "/:jobId",
  asyncHandler(async (req, res) => {
    const match = await matchesService.getOrComputeMatch(req.user!.id, req.params.jobId!);
    const body: ApiSuccess<MatchDto> = { success: true, data: match };
    res.json(body);
  }),
);
