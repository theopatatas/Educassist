import type { Request, Response, NextFunction } from "express";
import { Class, Enrollment } from "../db/models"; // adjust to your models export

export function teacherOwnsClass(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const classId = req.params[paramName];
    const userId = (req as any).user?.sub;

    const cls = await Class.findByPk(classId);
    if (!cls) return res.status(404).json({ ok: false, message: "Class not found" });

    if (String(cls.teacherId) !== String(userId)) {
      return res.status(403).json({ ok: false, message: "Forbidden (not your class)" });
    }
    (req as any).class = cls;
    return next();
  };
}

export function studentEnrolledInClass(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const classId = req.params[paramName];
    const userId = (req as any).user?.sub;

    const enr = await Enrollment.findOne({ where: { classId, studentId: userId } });
    if (!enr) return res.status(403).json({ ok: false, message: "Not enrolled in class" });

    return next();
  };
}
