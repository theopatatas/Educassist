import type { ErrorRequestHandler } from "express";

type HttpError = {
  statusCode?: number;
  status?: number;
  message?: string;
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  void next;
  console.error(error);
  const err =
    typeof error === "object" && error !== null
      ? (error as HttpError)
      : {};
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    ok: false,
    message: err.message || "Internal Server Error",
  });
};
