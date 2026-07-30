import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

/**
 * Infrastructure-only collection used to prove API/worker <-> Mongo
 * connectivity in Phase 1. This is NOT part of the domain data model
 * defined in Phase 0 (users, profiles, jobs, etc.) — those are introduced
 * in their respective phases.
 */
const systemHealthCheckSchema = new Schema(
  {
    pingId: { type: String, required: true, index: true },
    source: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true },
);

export type SystemHealthCheckDoc = InferSchemaType<typeof systemHealthCheckSchema>;

export const SystemHealthCheck: Model<SystemHealthCheckDoc> =
  (models.SystemHealthCheck as Model<SystemHealthCheckDoc>) ||
  model<SystemHealthCheckDoc>("SystemHealthCheck", systemHealthCheckSchema);
