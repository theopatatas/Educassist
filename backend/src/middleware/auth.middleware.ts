import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { applyActiveTakeoverContext } from "../modules/leave/takeover-context";


export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Missing Bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
  if (!(await applyActiveTakeoverContext(req, res))) return;
  return next();
}

export default requireAuth;
