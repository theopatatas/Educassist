import type { Request, Response } from "express";
import { createExamForTeacher, listExamsForStudent, listExamsForTeacher, updateExamForTeacher } from "./exams.service";

export async function listMyExams(req: Request, res: Response) {
  const user = (req as Request & { user?: { sub?: string; role?: string } }).user;
  const userId = user?.sub;
  const role = user?.role;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const exams =
    role === "student"
      ? await listExamsForStudent(userId)
      : await listExamsForTeacher(userId, {
          section: req.query.section as string | undefined,
          gradeLevel: req.query.gradeLevel as string | undefined,
        });
  if (exams === null) {
    return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
  }
  return res.json({ ok: true, exams });
}

export async function createMyExam(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const exam = await createExamForTeacher(userId, req.body ?? {});
  if (exam === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (exam === false) return res.status(400).json({ ok: false, message: "Invalid class or payload" });
  return res.status(201).json({ ok: true, exam });
}

export async function updateMyExam(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const exam = await updateExamForTeacher(userId, req.params.id, req.body ?? {});
  if (exam === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (exam === false) return res.status(404).json({ ok: false, message: "Exam not found" });
  return res.json({ ok: true, exam });
}
