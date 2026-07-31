import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const applicationEventSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    type: {
      type: String,
      enum: ["status_change", "interview_scheduled", "created"],
      required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String },
  },
  { timestamps: true },
);

applicationEventSchema.index({ applicationId: 1, createdAt: 1 });

export type ApplicationEventDoc = InferSchemaType<typeof applicationEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ApplicationEvent: Model<ApplicationEventDoc> =
  (models.ApplicationEvent as Model<ApplicationEventDoc>) ||
  model<ApplicationEventDoc>("ApplicationEvent", applicationEventSchema);
