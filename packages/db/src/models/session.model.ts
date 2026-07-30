import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // SHA-256 hash of the opaque refresh token. The raw token only ever
    // exists in the HttpOnly cookie on the client and briefly in memory
    // on the server while it's being hashed/compared — never persisted.
    refreshTokenHash: { type: String, required: true, index: true },

    // Every rotation of a given login chain keeps the same familyId.
    // If a refresh token from an already-rotated session is presented
    // again, we know it's been stolen/replayed and revoke the whole
    // family (see auth.service.ts).
    familyId: { type: String, required: true, index: true },

    userAgent: { type: String },
    // Never store raw IP long-term; a coarse hash is enough for
    // "new device" style security signals without being a tracking vector.
    ipHash: { type: String },

    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBySessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null },
  },
  { timestamps: false },
);

// TTL index: Mongo automatically purges sessions past their expiry.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: mongoose.Types.ObjectId };

export const Session: Model<SessionDoc> =
  (models.Session as Model<SessionDoc>) || model<SessionDoc>("Session", sessionSchema);
