import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

/**
 * Independent per-stage statuses (per Phase 0 amendment #4) so a PDF-parser
 * failure and an AI-misread are always distinguishable, and so the frontend
 * can show accurate progress instead of a single opaque "processing" flag.
 */
const stageStatusValues = ["pending", "processing", "complete", "failed", "not_started"] as const;

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    storageKey: { type: String, required: true }, // private object key — never a public URL
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true, index: true },

    isPrimary: { type: Boolean, default: false },

    uploadStatus: { type: String, enum: stageStatusValues, default: "complete" },
    textExtractionStatus: { type: String, enum: stageStatusValues, default: "pending" },
    // Structured AI extraction doesn't exist until Phase 8 — every resume
    // sits at "not_started" here until then. This is a real, honest status,
    // not a stub pretending to be "pending".
    structureExtractionStatus: { type: String, enum: stageStatusValues, default: "not_started" },
    confirmationStatus: { type: String, enum: stageStatusValues, default: "not_started" },

    parserUsed: { type: String }, // e.g. "pdf-parse@1.1.1", "mammoth@1.8.0"
    parseVersion: { type: Number, default: 1 },
    parseError: { type: String },

    rawText: { type: String },
    // Populated in Phase 8 by AI structured extraction; user-editable
    // corrections layered on top, never silently overwritten (Phase 0 §7).
    structuredData: { type: Schema.Types.Mixed },
    userCorrections: { type: Schema.Types.Mixed },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ResumeDoc = InferSchemaType<typeof resumeSchema> & { _id: mongoose.Types.ObjectId };
export type StageStatus = (typeof stageStatusValues)[number];

export const Resume: Model<ResumeDoc> =
  (models.Resume as Model<ResumeDoc>) || model<ResumeDoc>("Resume", resumeSchema);
