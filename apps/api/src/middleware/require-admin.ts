import type { NextFunction, Request, Response } from "express";
import { User } from "@job-copilot/db";
import { ApiError } from "../lib/errors.js";

/** Must run after requireAuth (needs req.user). */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());

  const user = await User.findById(req.user.id).select("role");
  if (!user || user.role !== "admin") {
    return next(ApiError.forbidden("Admin access required"));
  }
  next();
}
