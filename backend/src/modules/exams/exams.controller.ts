import type { Request, Response } from "express";
import { createExamForTeacher, deleteExamForTeacher, listExamsForStudent, listExamsForTeacher, updateExamForTeacher } from "./exams.service";

function parseCoverage(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeExamPayload(req: Request) {
  const body = req.body ?? {};
  return {
    ...body,
    classId: body.classId ? Number(body.classId) : undefined,
    coverage: parseCoverage(body.coverage),
  };
}

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

  const exam = await createExamForTeacher(userId, normalizeExamPayload(req));
  if (exam === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (exam === "past_date") return res.status(400).json({ ok: false, message: "You cannot schedule an exam in the past." });
  if (exam === false) return res.status(400).json({ ok: false, message: "Invalid class or payload" });
  return res.status(201).json({ ok: true, exam });
}

export async function updateMyExam(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const exam = await updateExamForTeacher(userId, req.params.id, normalizeExamPayload(req));
  if (exam === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (exam === "past_date") return res.status(400).json({ ok: false, message: "You cannot schedule an exam in the past." });
  if (exam === false) return res.status(404).json({ ok: false, message: "Exam not found" });
  return res.json({ ok: true, exam });
}

export async function deleteMyExam(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const deleted = await deleteExamForTeacher(userId, req.params.id);
  if (deleted === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (deleted === false) return res.status(404).json({ ok: false, message: "Exam not found" });
  return res.json({ ok: true, message: "Exam schedule marked as done and deleted successfully." });
}
