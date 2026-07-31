import type { HydratedDocument } from "mongoose";
import { JobAlert, type JobAlertDoc } from "@job-copilot/db";
import type { JobAlertDto, CreateJobAlertInput, UpdateJobAlertInput } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";

function toDto(doc: HydratedDocument<JobAlertDoc>): JobAlertDto {
  return {
    id: String(doc._id),
    name: doc.name,
    criteria: {
      keywords: doc.criteria?.keywords ?? undefined,
      skills: doc.criteria?.skills ?? undefined,
      location: doc.criteria?.location ?? undefined,
      workMode: (doc.criteria?.workMode as JobAlertDto["criteria"]["workMode"]) ?? undefined,
      experienceMin: doc.criteria?.experienceMin ?? undefined,
      salaryMin: doc.criteria?.salaryMin ?? undefined,
      minMatchScore: doc.criteria?.minMatchScore ?? undefined,
    },
    frequency: doc.frequency as JobAlertDto["frequency"],
    isActive: doc.isActive,
    lastRunAt: doc.lastRunAt ? doc.lastRunAt.toISOString() : null,
    createdAt: doc.createdAt!.toISOString(),
  };
}

export async function listAlerts(userId: string): Promise<JobAlertDto[]> {
  const alerts = await JobAlert.find({ userId }).sort({ createdAt: -1 });
  return alerts.map(toDto);
}

export async function createAlert(userId: string, input: CreateJobAlertInput): Promise<JobAlertDto> {
  const alert = await JobAlert.create({
    userId,
    name: input.name,
    criteria: input.criteria,
    frequency: input.frequency,
  });
  return toDto(alert);
}

async function getOwnedAlert(userId: string, alertId: string): Promise<HydratedDocument<JobAlertDoc>> {
  const alert = await JobAlert.findOne({ _id: alertId, userId });
  if (!alert) throw ApiError.notFound("Alert not found");
  return alert;
}

export async function updateAlert(
  userId: string,
  alertId: string,
  input: UpdateJobAlertInput,
): Promise<JobAlertDto> {
  const alert = await getOwnedAlert(userId, alertId);
  if (input.name !== undefined) alert.name = input.name;
  if (input.criteria !== undefined) alert.set("criteria", input.criteria);
  if (input.frequency !== undefined) alert.frequency = input.frequency;
  if (input.isActive !== undefined) alert.isActive = input.isActive;
  await alert.save();
  return toDto(alert);
}

export async function deleteAlert(userId: string, alertId: string): Promise<void> {
  const alert = await getOwnedAlert(userId, alertId);
  await alert.deleteOne();
}
