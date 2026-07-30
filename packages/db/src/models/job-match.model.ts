import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const evidenceItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["skill", "experience", "role", "project", "education", "preference"],
      required: true,
    },
    requirement: { type: String, required: true },
    status: { type: String, enum: ["matched", "missing", "partial", "no_evidence"], required: true },
    strength: { type: Number, min: 0, max: 1, required: true },
  },
  { _id: false },
);

const penaltyItemSchema = new Schema(
  {
    reason: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const jobMatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },

    overallScore: { type: Number, min: 0, max: 100, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },

    breakdown: {
      skills: { type: Number, required: true },
      experience: { type: Number, required: true },
      projects: { type: Number, required: true },
      role: { type: Number, required: true },
      education: { type: Number, required: true },
      preferences: { type: Number, required: true },
    },

    matchedSkills: [{ type: String }],
    missingRequiredSkills: [{ type: String }],
    missingPreferredSkills: [{ type: String }],

    evidence: [evidenceItemSchema],
    penalties: [penaltyItemSchema],

    // Bumped whenever the scoring algorithm changes, so old and new results
    // are never silently mixed (Phase 0 §11) — a stale-version match is
    // recomputed rather than trusted.
    scoringVersion: { type: Number, required: true },

    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });
jobMatchSchema.index({ userId: 1, overallScore: -1 });

export type JobMatchDoc = InferSchemaType<typeof jobMatchSchema> & { _id: mongoose.Types.ObjectId };

export const JobMatch: Model<JobMatchDoc> =
  (models.JobMatch as Model<JobMatchDoc>) || model<JobMatchDoc>("JobMatch", jobMatchSchema);
