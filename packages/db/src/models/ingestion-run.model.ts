import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const ingestionRunSchema = new Schema(
  {
    provider: { type: String, required: true },
    status: { type: String, enum: ["running", "complete", "failed"], default: "running" },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },

    fetchedCount: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    errorSummary: { type: String },
  },
  { timestamps: true },
);

ingestionRunSchema.index({ startedAt: -1 });

export type IngestionRunDoc = InferSchemaType<typeof ingestionRunSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const IngestionRun: Model<IngestionRunDoc> =
  (models.IngestionRun as Model<IngestionRunDoc>) ||
  model<IngestionRunDoc>("IngestionRun", ingestionRunSchema);
