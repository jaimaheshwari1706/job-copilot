import { Router } from "express";
import {
  onboardingSchema,
  profileUpdateSchema,
  confirmSkillsSchema,
  type ApiSuccess,
  type Profile as ProfileDto,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import * as profileService from "./profile.service.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const profile = await profileService.getProfile(req.user!.id);
    const body: ApiSuccess<ProfileDto> = { success: true, data: profile };
    res.json(body);
  }),
);

profileRouter.patch(
  "/",
  validateBody(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfile(req.user!.id, req.body);
    const body: ApiSuccess<ProfileDto> = { success: true, data: profile };
    res.json(body);
  }),
);

profileRouter.post(
  "/skills/confirm",
  validateBody(confirmSkillsSchema),
  asyncHandler(async (req, res) => {
    const profile = await profileService.confirmSkills(req.user!.id, req.body.skillNames);
    const body: ApiSuccess<ProfileDto> = { success: true, data: profile };
    res.json(body);
  }),
);

/** Saves wizard progress without marking onboarding complete. */
profileRouter.patch(
  "/onboarding",
  validateBody(onboardingSchema.partial()),
  asyncHandler(async (req, res) => {
    const profile = await profileService.saveOnboardingProgress(req.user!.id, req.body);
    const body: ApiSuccess<ProfileDto> = { success: true, data: profile };
    res.json(body);
  }),
);

/** Marks onboarding complete — requires the full required field set. */
profileRouter.post(
  "/onboarding/complete",
  validateBody(onboardingSchema),
  asyncHandler(async (req, res) => {
    const profile = await profileService.completeOnboarding(req.user!.id, req.body);
    const body: ApiSuccess<ProfileDto> = { success: true, data: profile };
    res.json(body);
  }),
);
