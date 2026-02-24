import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const status = err?.statusCode || err?.status || 500;

  res.status(status).json({
    ok: false,
    message: err?.message || "Internal Server Error",
  });
}
