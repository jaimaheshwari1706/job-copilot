import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const applicationStatusValues = [
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Optional: a user can track an application to a job found elsewhere,
    // not just one ingested into this system (Phase 0 amendment #13).
    jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },

    // Immutable-ish snapshot captured at apply-time, so application
    // history stays accurate even if the original Job document later
    // changes or expires (amendment #13).
    jobSnapshot: {
      title: { type: String, required: true },
      company: { type: String, required: true },
      location: { type: String },
      applyUrl: { type: String },
    },

    status: { type: String, enum: applicationStatusValues, default: "saved", required: true },

    resumeVersionId: { type: Schema.Types.ObjectId, default: null }, // reserved for Phase 8's tailoring versions
    coverLetterId: { type: Schema.Types.ObjectId, ref: "CoverLetter", default: null },

    appliedAt: { type: Date },
    recruiterContact: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    interviewDate: { type: Date },
    salaryInfo: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String },
    },
    source: { type: String }, // e.g. "job-copilot", "linkedin", "referral"

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
// One application per (user, job) for jobs tracked in-system — prevents
// duplicate rows when "Apply" is clicked more than once on the same job.
// Sparse because jobId is null for external/custom applications.
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true, sparse: true });

export type ApplicationDoc = InferSchemaType<typeof applicationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type ApplicationStatus = (typeof applicationStatusValues)[number];

export const Application: Model<ApplicationDoc> =
  (models.Application as Model<ApplicationDoc>) ||
  model<ApplicationDoc>("Application", applicationSchema);
