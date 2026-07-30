import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const jobSourceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["demo", "api"], required: true },
    isActive: { type: Boolean, default: true },
    lastFetchedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type JobSourceDoc = InferSchemaType<typeof jobSourceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const JobSource: Model<JobSourceDoc> =
  (models.JobSource as Model<JobSourceDoc>) || model<JobSourceDoc>("JobSource", jobSourceSchema);
