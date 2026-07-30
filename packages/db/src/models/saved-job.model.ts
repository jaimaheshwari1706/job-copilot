import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const savedJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    status: { type: String, enum: ["saved", "hidden"], required: true },
  },
  { timestamps: true },
);

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
savedJobSchema.index({ userId: 1, status: 1 });

export type SavedJobDoc = InferSchemaType<typeof savedJobSchema> & { _id: mongoose.Types.ObjectId };

export const SavedJob: Model<SavedJobDoc> =
  (models.SavedJob as Model<SavedJobDoc>) || model<SavedJobDoc>("SavedJob", savedJobSchema);
