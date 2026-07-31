import { Router } from "express";
import {
  createApplicationSchema,
  updateApplicationSchema,
  addApplicationNoteSchema,
  type ApiSuccess,
  type Application as ApplicationDto,
  type ApplicationEvent as ApplicationEventDto,
  type ApplicationNote as ApplicationNoteDto,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import * as applicationsService from "./applications.service.js";

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

applicationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const applications = await applicationsService.listApplications(req.user!.id, status);
    const body: ApiSuccess<ApplicationDto[]> = { success: true, data: applications };
    res.json(body);
  }),
);

applicationsRouter.post(
  "/",
  validateBody(createApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await applicationsService.createApplication(req.user!.id, req.body);
    const body: ApiSuccess<ApplicationDto> = { success: true, data: application };
    res.status(201).json(body);
  }),
);

applicationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const application = await applicationsService.getApplication(req.user!.id, req.params.id!);
    const body: ApiSuccess<ApplicationDto> = { success: true, data: application };
    res.json(body);
  }),
);

applicationsRouter.patch(
  "/:id",
  validateBody(updateApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await applicationsService.updateApplication(req.user!.id, req.params.id!, req.body);
    const body: ApiSuccess<ApplicationDto> = { success: true, data: application };
    res.json(body);
  }),
);

applicationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await applicationsService.deleteApplication(req.user!.id, req.params.id!);
    const body: ApiSuccess<{ deleted: true }> = { success: true, data: { deleted: true } };
    res.json(body);
  }),
);

applicationsRouter.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const events = await applicationsService.listApplicationEvents(req.user!.id, req.params.id!);
    const body: ApiSuccess<ApplicationEventDto[]> = { success: true, data: events };
    res.json(body);
  }),
);

applicationsRouter.get(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const notes = await applicationsService.listApplicationNotes(req.user!.id, req.params.id!);
    const body: ApiSuccess<ApplicationNoteDto[]> = { success: true, data: notes };
    res.json(body);
  }),
);

applicationsRouter.post(
  "/:id/notes",
  validateBody(addApplicationNoteSchema),
  asyncHandler(async (req, res) => {
    const note = await applicationsService.addApplicationNote(req.user!.id, req.params.id!, req.body.content);
    const body: ApiSuccess<ApplicationNoteDto> = { success: true, data: note };
    res.status(201).json(body);
  }),
);
