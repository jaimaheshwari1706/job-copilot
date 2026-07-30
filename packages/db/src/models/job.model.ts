import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    normalizedTitle: { type: String, required: true, index: true },
    company: { type: String, required: true, trim: true, index: true },
    companyLogo: { type: String },

    location: { type: String, trim: true },
    country: { type: String, trim: true },
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"] },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship"],
      default: "full_time",
    },

    experienceMin: { type: Number, min: 0 },
    experienceMax: { type: Number, min: 0 },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    salaryCurrency: { type: String, default: "USD" },

    description: { type: String, required: true },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    preferredQualifications: [{ type: String }],
    skills: [{ type: String, trim: true }],

    // Derived at ingestion time by matching `requirements`/`preferredQualifications`
    // text against the canonical skill dictionary (Phase 5.5) — NOT a full NLP
    // requirement extractor (that's Phase 8's JD analyzer territory). A missing
    // REQUIRED skill must hurt a match more than a missing PREFERRED one
    // (Phase 0 amendment #7), so these are kept separate rather than flat.
    requiredSkills: [{ type: String, trim: true }],
    preferredSkills: [{ type: String, trim: true }],

    // Candidate detection fingerprint (NOT globally unique — see amendment
    // #5). Legitimate reposts and similarly-titled roles from the same
    // company must not be forced together by a strict unique constraint.
    dedupeFingerprint: { type: String, index: true },

    postedAt: { type: Date },
    expiresAt: { type: Date },

    status: { type: String, enum: ["active", "expired", "removed"], default: "active", index: true },
  },
  { timestamps: true },
);

jobSchema.index({ postedAt: -1 });
jobSchema.index({ skills: 1 });
// Basic multi-field text search for keyword queries (title/company/description).
jobSchema.index({ title: "text", company: "text", description: "text" });

export type JobDoc = InferSchemaType<typeof jobSchema> & { _id: mongoose.Types.ObjectId };

export const Job: Model<JobDoc> = (models.Job as Model<JobDoc>) || model<JobDoc>("Job", jobSchema);
