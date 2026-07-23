import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";


export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Missing Bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}

export default requireAuth;
