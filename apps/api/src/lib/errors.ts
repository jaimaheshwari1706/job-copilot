import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@job-copilot/shared";
import { logger } from "./logger.js";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static validation(message: string, details?: unknown) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static internal(message = "Internal server error", details?: unknown) {
    return new ApiError(500, "INTERNAL_ERROR", message, details);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Multer throws its own error class (not an ApiError) when a file upload
 * violates `limits` (size, unexpected field, etc.) or a `fileFilter`
 * rejects it. Without this translation those errors fell through to a
 * generic 500 instead of the 400 they actually are — confirmed live by
 * uploading an 11MB file against the 10MB resume-upload limit.
 */
function multerErrorToApiError(err: unknown): ApiError | undefined {
  if (!(err instanceof Error) || err.name !== "MulterError") return undefined;
  const code = (err as Error & { code?: string }).code;
  if (code === "LIMIT_FILE_SIZE") {
    return ApiError.badRequest("File is too large.");
  }
  return ApiError.badRequest(err.message || "Invalid file upload.");
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const translated = err instanceof ApiError ? err : multerErrorToApiError(err);
  const apiError = translated ?? ApiError.internal("Unexpected error", undefined);

  if (!translated) {
    logger.error({ err, path: req.path }, "Unhandled error");
  } else if (apiError.statusCode >= 500) {
    logger.error({ err: apiError, path: req.path }, "Server error");
  }

  const body: ApiErrorBody = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      // Never leak internals in production responses
      details: apiError.statusCode < 500 || process.env.NODE_ENV !== "production"
        ? apiError.details
        : undefined,
    },
  };

  res.status(apiError.statusCode).json(body);
}
