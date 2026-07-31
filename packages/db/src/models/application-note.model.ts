import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const applicationNoteSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
);

applicationNoteSchema.index({ applicationId: 1, createdAt: 1 });

export type ApplicationNoteDoc = InferSchemaType<typeof applicationNoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ApplicationNote: Model<ApplicationNoteDoc> =
  (models.ApplicationNote as Model<ApplicationNoteDoc>) ||
  model<ApplicationNoteDoc>("ApplicationNote", applicationNoteSchema);
