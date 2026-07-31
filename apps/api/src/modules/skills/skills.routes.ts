import { Router } from "express";
import type { ApiSuccess, SkillGapAnalysisResult } from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { getSkillGapAnalysis } from "./skills.service.js";

export const skillsRouter = Router();
skillsRouter.use(requireAuth);

skillsRouter.get(
  "/gap-analysis",
  asyncHandler(async (req, res) => {
    const result = await getSkillGapAnalysis(req.user!.id);
    const body: ApiSuccess<SkillGapAnalysisResult> = { success: true, data: result };
    res.json(body);
  }),
);
