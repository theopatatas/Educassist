import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ ok: false, message: "Validation error", issues: err.issues });
  }

  if (typeof err === "object" && err !== null) {
    const anyErr = err as { status?: number; code?: number; message?: string };
    const status = anyErr.status ?? anyErr.code;
    if (status && typeof status === "number") {
      return res.status(status).json({ ok: false, message: anyErr.message ?? "Request failed" });
    }
  }

  return res.status(500).json({ ok: false, message: "Internal server error" });
}

export default errorHandler;
