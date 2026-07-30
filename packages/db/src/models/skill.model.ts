import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const skillDictionaryEntrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // canonical display name
    aliases: [{ type: String, trim: true }], // lowercase-matched at lookup time
    category: { type: String, trim: true },
    relatedSkills: [{ type: String, trim: true }], // loose association by name, not a hard FK
  },
  { timestamps: true },
);

skillDictionaryEntrySchema.index({ aliases: 1 });

export type SkillDictionaryEntryDoc = InferSchemaType<typeof skillDictionaryEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Skill: Model<SkillDictionaryEntryDoc> =
  (models.Skill as Model<SkillDictionaryEntryDoc>) ||
  model<SkillDictionaryEntryDoc>("Skill", skillDictionaryEntrySchema);
