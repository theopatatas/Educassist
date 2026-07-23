import type { Request, Response, NextFunction } from "express";
import { Student } from "../db/models/Student.model";

export function requireRole(
  ...roles: Array<"admin" | "managed_admin" | "teacher" | "student" | "parent">
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as
      | { role?: string; sub?: string }
      | undefined;
    if (!user?.role)
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    const allowed =
      user.role === "super_admin"
        ? roles.includes("admin")
        : user.role === "admin"
          ? roles.includes("managed_admin")
          : roles.includes(user.role as "teacher" | "student" | "parent");
    if (!allowed)
      return res.status(403).json({ ok: false, message: "Forbidden" });
    if (user.role === "student" && user.sub) {
      const student = await Student.findOne({
        where: { userId: user.sub },
        attributes: ["graduatedAt"],
      });
      if (student?.graduatedAt) {
        const allowedGraduateRoutes = new Set([
          "/api/students/me",
          "/api/classes/grades/me",
          "/api/ai/chat",
        ]);
        if (!allowedGraduateRoutes.has(req.originalUrl.split("?")[0])) {
          return res.status(403).json({
            ok: false,
            code: "GRADUATED_READ_ONLY",
            message: "Graduated accounts can only view grades",
          });
        }
      }
    }
    return next();
  };
}
