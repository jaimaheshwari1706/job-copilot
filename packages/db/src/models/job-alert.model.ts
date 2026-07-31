import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const jobAlertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },

    criteria: {
      keywords: { type: String },
      skills: [{ type: String }],
      location: { type: String },
      workMode: { type: String, enum: ["remote", "hybrid", "onsite"] },
      experienceMin: { type: Number },
      salaryMin: { type: Number },
      minMatchScore: { type: Number, min: 0, max: 100 },
    },

    frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobAlertSchema.index({ isActive: 1, frequency: 1 });

export type JobAlertDoc = InferSchemaType<typeof jobAlertSchema> & { _id: mongoose.Types.ObjectId };

export const JobAlert: Model<JobAlertDoc> =
  (models.JobAlert as Model<JobAlertDoc>) || model<JobAlertDoc>("JobAlert", jobAlertSchema);
