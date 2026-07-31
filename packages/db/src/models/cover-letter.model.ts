import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const coverLetterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },

    tone: { type: String, enum: ["professional", "concise", "technical", "conversational"], required: true },
    content: { type: String, required: true },

    // Lineage/versioning per Phase 0 amendment #12 — a future regeneration
    // must never silently clobber a version the user has already edited.
    promptVersion: { type: Number, default: 1 },
    model: { type: String },
    generatedAt: { type: Date, default: Date.now },
    editedAt: { type: Date },
    userEdited: { type: Boolean, default: false },
  },
  { timestamps: true },
);

coverLetterSchema.index({ userId: 1, jobId: 1 });

export type CoverLetterDoc = InferSchemaType<typeof coverLetterSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CoverLetter: Model<CoverLetterDoc> =
  (models.CoverLetter as Model<CoverLetterDoc>) ||
  model<CoverLetterDoc>("CoverLetter", coverLetterSchema);
