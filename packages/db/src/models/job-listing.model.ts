import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const jobListingSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    sourceId: { type: Schema.Types.ObjectId, ref: "JobSource", required: true },
    sourceJobId: { type: String, required: true },

    applyUrl: { type: String, required: true },
    sourceUrl: { type: String },

    postedAt: { type: Date },
    expiresAt: { type: Date },
    lastSeenAt: { type: Date, default: Date.now },

    // Raw provider payload preserved for debugging normalization issues
    // (Phase 0 amendment #8) — reproducible without re-fetching from source.
    rawPayload: { type: Schema.Types.Mixed },
    providerSchemaVersion: { type: String },
    normalizerVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Hard dedup identity — the ONE globally-unique constraint in the job
// pipeline (contrast with Job.dedupeFingerprint, which is fuzzy/non-unique).
jobListingSchema.index({ sourceId: 1, sourceJobId: 1 }, { unique: true });

export type JobListingDoc = InferSchemaType<typeof jobListingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const JobListing: Model<JobListingDoc> =
  (models.JobListing as Model<JobListingDoc>) ||
  model<JobListingDoc>("JobListing", jobListingSchema);
