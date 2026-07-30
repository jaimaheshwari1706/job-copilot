import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const skillEntrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    source: { type: String, enum: ["user", "ai_extracted", "ai_confirmed"], default: "user" },
    confirmed: { type: Boolean, default: true }, // true by default for user-entered skills
  },
  { _id: false },
);

const employmentEntrySchema = new Schema(
  {
    company: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    start: { type: String },
    end: { type: String },
    current: { type: Boolean, default: false },
    bullets: [{ type: String }],
  },
  { _id: false },
);

const educationEntrySchema = new Schema(
  {
    institution: { type: String, required: true, trim: true },
    degree: { type: String },
    field: { type: String },
    start: { type: String },
    end: { type: String },
  },
  { _id: false },
);

const projectEntrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    tech: [{ type: String }],
    link: { type: String },
  },
  { _id: false },
);

const certificationEntrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String },
    date: { type: String },
  },
  { _id: false },
);

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    name: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, max: 60 },
    location: { type: String, trim: true },
    summary: { type: String, maxlength: 2000 },

    targetRoles: [{ type: String, trim: true }],
    preferredLocations: [{ type: String, trim: true }],
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"] },

    expectedSalary: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: "USD" },
    },

    links: {
      github: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },

    skills: [skillEntrySchema],
    employmentHistory: [employmentEntrySchema],
    education: [educationEntrySchema],
    projects: [projectEntrySchema],
    certifications: [certificationEntrySchema],

    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ProfileDoc = InferSchemaType<typeof profileSchema> & { _id: mongoose.Types.ObjectId };

export const Profile: Model<ProfileDoc> =
  (models.Profile as Model<ProfileDoc>) || model<ProfileDoc>("Profile", profileSchema);
