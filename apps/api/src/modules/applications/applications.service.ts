import type { HydratedDocument } from "mongoose";
import {
  Application,
  ApplicationEvent,
  ApplicationNote,
  Job,
  JobListing,
  type ApplicationDoc,
} from "@job-copilot/db";
import type {
  Application as ApplicationDto,
  ApplicationEvent as ApplicationEventDto,
  ApplicationNote as ApplicationNoteDto,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";

function toApplicationDto(doc: HydratedDocument<ApplicationDoc>): ApplicationDto {
  return {
    id: String(doc._id),
    jobId: doc.jobId ? String(doc.jobId) : null,
    jobSnapshot: {
      title: doc.jobSnapshot!.title,
      company: doc.jobSnapshot!.company,
      location: doc.jobSnapshot!.location ?? undefined,
      applyUrl: doc.jobSnapshot!.applyUrl ?? undefined,
    },
    status: doc.status as ApplicationDto["status"],
    coverLetterId: doc.coverLetterId ? String(doc.coverLetterId) : null,
    appliedAt: doc.appliedAt ? doc.appliedAt.toISOString() : null,
    recruiterContact: doc.recruiterContact
      ? {
          name: doc.recruiterContact.name ?? undefined,
          email: doc.recruiterContact.email ?? undefined,
          phone: doc.recruiterContact.phone ?? undefined,
        }
      : undefined,
    interviewDate: doc.interviewDate ? doc.interviewDate.toISOString() : null,
    salaryInfo: doc.salaryInfo
      ? {
          min: doc.salaryInfo.min ?? undefined,
          max: doc.salaryInfo.max ?? undefined,
          currency: doc.salaryInfo.currency ?? undefined,
        }
      : undefined,
    source: doc.source ?? undefined,
    createdAt: doc.createdAt!.toISOString(),
    updatedAt: doc.updatedAt!.toISOString(),
  };
}

async function resolveJobSnapshot(
  jobId: string | undefined,
  provided: CreateApplicationInput["jobSnapshot"],
): Promise<ApplicationDoc["jobSnapshot"]> {
  if (!jobId) {
    if (!provided) throw ApiError.badRequest("Either jobId or jobSnapshot must be provided");
    return provided;
  }

  // A stored jobId's snapshot is resolved server-side from the actual Job
  // record, not trusted from the client — the snapshot exists to survive
  // the ORIGINAL job changing later, not to let the client assert facts.
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound("Job not found");
  const listing = await JobListing.findOne({ jobId }).sort({ lastSeenAt: -1 });

  return {
    title: job.title,
    company: job.company,
    location: job.location ?? undefined,
    applyUrl: listing?.applyUrl,
  };
}

/**
 * Idempotent by design: clicking "Apply" more than once on the same job
 * returns the existing application rather than erroring or duplicating.
 * External/custom applications (no jobId) always create a new row, since
 * there's no natural dedup key for them.
 */
export async function createApplication(
  userId: string,
  input: CreateApplicationInput,
): Promise<ApplicationDto> {
  if (input.jobId) {
    const existing = await Application.findOne({ userId, jobId: input.jobId, deletedAt: null });
    if (existing) return toApplicationDto(existing);
  }

  const jobSnapshot = await resolveJobSnapshot(input.jobId, input.jobSnapshot);

  const application = await Application.create({
    userId,
    jobId: input.jobId ?? null,
    jobSnapshot,
    status: input.status,
    source: input.source,
    appliedAt: input.status === "applied" ? new Date() : undefined,
  });

  await ApplicationEvent.create({
    applicationId: application._id,
    type: "created",
    toStatus: application.status,
  });

  return toApplicationDto(application);
}

export async function listApplications(
  userId: string,
  status?: string,
): Promise<ApplicationDto[]> {
  const filter: Record<string, unknown> = { userId, deletedAt: null };
  if (status) filter.status = status;
  const docs = await Application.find(filter).sort({ updatedAt: -1 });
  return docs.map(toApplicationDto);
}

async function getOwnedApplication(
  userId: string,
  applicationId: string,
): Promise<HydratedDocument<ApplicationDoc>> {
  const doc = await Application.findOne({ _id: applicationId, userId, deletedAt: null });
  if (!doc) throw ApiError.notFound("Application not found");
  return doc;
}

export async function getApplication(userId: string, applicationId: string): Promise<ApplicationDto> {
  return toApplicationDto(await getOwnedApplication(userId, applicationId));
}

export async function updateApplication(
  userId: string,
  applicationId: string,
  input: UpdateApplicationInput,
): Promise<ApplicationDto> {
  const application = await getOwnedApplication(userId, applicationId);

  if (input.status && input.status !== application.status) {
    await ApplicationEvent.create({
      applicationId: application._id,
      type: "status_change",
      fromStatus: application.status,
      toStatus: input.status,
    });
    if (input.status === "applied" && !application.appliedAt) {
      application.appliedAt = new Date();
    }
    application.status = input.status;
  }

  if (input.recruiterContact) application.set("recruiterContact", input.recruiterContact);
  if (input.salaryInfo) application.set("salaryInfo", input.salaryInfo);
  if (input.interviewDate) {
    application.interviewDate = new Date(input.interviewDate);
    await ApplicationEvent.create({ applicationId: application._id, type: "interview_scheduled" });
  }

  await application.save();
  return toApplicationDto(application);
}

export async function deleteApplication(userId: string, applicationId: string): Promise<void> {
  const application = await getOwnedApplication(userId, applicationId);
  application.deletedAt = new Date(); // soft delete — application history is candidate-owned (amendment #17)
  await application.save();
}

export async function listApplicationEvents(
  userId: string,
  applicationId: string,
): Promise<ApplicationEventDto[]> {
  await getOwnedApplication(userId, applicationId); // ownership check
  const events = await ApplicationEvent.find({ applicationId }).sort({ createdAt: 1 });
  return events.map((e) => ({
    id: String(e._id),
    type: e.type as ApplicationEventDto["type"],
    fromStatus: e.fromStatus as ApplicationEventDto["fromStatus"],
    toStatus: e.toStatus as ApplicationEventDto["toStatus"],
    createdAt: e.createdAt!.toISOString(),
  }));
}

export async function listApplicationNotes(
  userId: string,
  applicationId: string,
): Promise<ApplicationNoteDto[]> {
  await getOwnedApplication(userId, applicationId);
  const notes = await ApplicationNote.find({ applicationId }).sort({ createdAt: 1 });
  return notes.map((n) => ({ id: String(n._id), content: n.content, createdAt: n.createdAt!.toISOString() }));
}

export async function addApplicationNote(
  userId: string,
  applicationId: string,
  content: string,
): Promise<ApplicationNoteDto> {
  await getOwnedApplication(userId, applicationId);
  const note = await ApplicationNote.create({ applicationId, userId, content });
  return { id: String(note._id), content: note.content, createdAt: note.createdAt!.toISOString() };
}
