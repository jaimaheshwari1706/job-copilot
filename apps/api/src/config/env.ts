import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Auth
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  // In production this MUST be true (cookie requires HTTPS). Defaulted off
  // only so local http://localhost development isn't broken out of the box.
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Storage (local-disk provider for now; swappable for S3 later behind the same interface)
  // Default resolves to <repo-root>/data/uploads (two levels up from apps/api's
  // cwd) so api and worker share the same path in local dev without Docker.
  // In Docker, both containers run from /repo/apps/<name>, so this resolves
  // to the same /repo/data/uploads in both — mount a shared volume there.
  STORAGE_DIR: z
    .string()
    .default(() => path.resolve(process.cwd(), "..", "..", "data", "uploads")),
  SIGNED_URL_SECRET: z.string().min(32, "SIGNED_URL_SECRET must be at least 32 characters"),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

/**
 * Fail fast on startup if required configuration is missing/invalid,
 * rather than surfacing a confusing error deep inside a request handler.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  if (parsed.data.NODE_ENV === "production" && !parsed.data.COOKIE_SECURE) {
    console.error("COOKIE_SECURE must be true when NODE_ENV=production (refresh cookie requires HTTPS).");
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
