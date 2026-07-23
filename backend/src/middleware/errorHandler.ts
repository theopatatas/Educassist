import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  void _next;
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ ok: false, message: "Validation error", issues: err.issues });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: false,
        message: "The uploaded file exceeds the allowed size.",
      });
    }
    return res
      .status(400)
      .json({ ok: false, message: err.message || "File upload failed." });
  }

  if (typeof err === "object" && err !== null) {
    const anyErr = err as { status?: number; code?: number; message?: string };
    const status = anyErr.status ?? anyErr.code;
    if (status && typeof status === "number") {
      return res
        .status(status)
        .json({ ok: false, message: anyErr.message ?? "Request failed" });
    }
  }

  return res.status(500).json({ ok: false, message: "Internal server error" });
}

export default errorHandler;
