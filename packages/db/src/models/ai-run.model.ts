import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const aiRunSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    feature: { type: String, required: true }, // e.g. "jd-analysis", "cover-letter"
    provider: { type: String, required: true },
    model: { type: String, required: true },
    promptVersion: { type: Number, default: 1 },

    status: { type: String, enum: ["success", "failed"], required: true },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    // Populated from a per-model $/token table maintained alongside the
    // provider config — left undefined when that table doesn't have an
    // entry for the model, rather than guessing.
    estimatedCostUsd: { type: Number },
    latencyMs: { type: Number, required: true },
    repaired: { type: Boolean, default: false }, // whether a schema-repair retry was needed

    // Deliberately NOT storing prompt/response content — Phase 0 §33: "Do
    // NOT log sensitive resume content unnecessarily." Only metadata.
    error: { type: String },
  },
  { timestamps: true },
);

aiRunSchema.index({ userId: 1, createdAt: -1 });
aiRunSchema.index({ feature: 1, createdAt: -1 });

export type AiRunDoc = InferSchemaType<typeof aiRunSchema> & { _id: mongoose.Types.ObjectId };

export const AiRun: Model<AiRunDoc> =
  (models.AiRun as Model<AiRunDoc>) || model<AiRunDoc>("AiRun", aiRunSchema);
