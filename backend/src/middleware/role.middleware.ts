import type { Request, Response, NextFunction } from "express";

export function requireRole(...roles: Array<"admin" | "teacher" | "student" | "parent">) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { role?: string } | undefined;
    if (!user?.role) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (!roles.includes(user.role as any)) return res.status(403).json({ ok: false, message: "Forbidden" });
    return next();
  };
}
