import type { Request, Response, NextFunction } from "express";
import { Student } from "../db/models/Student.model";
import type { RouteRole, UserRole } from "../types/auth";

function isUserRole(role: string): role is UserRole {
  return ["super_admin", "admin", "teacher", "student", "parent"].includes(
    role,
  );
}

export function requireRole(...roles: RouteRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.role)
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    const allowed =
      user.role === "super_admin"
        ? roles.includes("admin")
        : user.role === "admin"
          ? roles.includes("managed_admin")
          : isUserRole(user.role) &&
            user.role !== "super_admin" &&
            user.role !== "admin" &&
            roles.includes(user.role);
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
