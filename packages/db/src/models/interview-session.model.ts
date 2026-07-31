import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const interviewQuestionCategoryValues = [
  "javascript",
  "react",
  "nodejs",
  "database",
  "apis",
  "testing",
  "system_design",
  "behavioral",
  "project_specific",
] as const;

const evaluationSchema = new Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    // Explicit uncertainty marker per Phase 0 §23: "Do not show fake
    // precision where evaluation is subjective." A behavioral answer's
    // evaluation is inherently less certain than a factual technical one.
    confidence: { type: String, enum: ["low", "medium", "high"] },
    strengths: [{ type: String }],
    missingConcepts: [{ type: String }],
    betterAnswerStructure: { type: String },
    followUpQuestion: { type: String },
  },
  { _id: false },
);

const interviewQuestionSchema = new Schema(
  {
    category: { type: String, enum: interviewQuestionCategoryValues, required: true },
    question: { type: String, required: true },
    userAnswer: { type: String },
    evaluation: evaluationSchema,
    answeredAt: { type: Date },
  },
  { _id: false },
);

const interviewSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },

    type: { type: String, enum: ["prep", "mock"], required: true },
    status: { type: String, enum: ["active", "completed"], default: "active" },

    questions: [interviewQuestionSchema],

    completedAt: { type: Date },
  },
  { timestamps: true },
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });

export type InterviewSessionDoc = InferSchemaType<typeof interviewSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type InterviewQuestionCategory = (typeof interviewQuestionCategoryValues)[number];

export const InterviewSession: Model<InterviewSessionDoc> =
  (models.InterviewSession as Model<InterviewSessionDoc>) ||
  model<InterviewSessionDoc>("InterviewSession", interviewSessionSchema);
