import type { Request, Response } from "express";
import {
  createQuizForTeacher,
  listQuizzesForStudent,
  listQuizResultsForTeacher,
  listQuizzesForTeacher,
  startQuizForStudent,
  submitQuizForStudent,
  updateQuizForTeacher,
} from "./quizzes.service";

export async function listMyQuizzes(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  const role = (req as any).user?.role as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quizzes = role === "student" ? await listQuizzesForStudent(userId) : await listQuizzesForTeacher(userId);
  if (!quizzes) {
    return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
  }
  return res.json({ ok: true, quizzes });
}

export async function createMyQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quiz = await createQuizForTeacher(userId, req.body ?? {});
  if (quiz === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (quiz === false) return res.status(400).json({ ok: false, message: "Invalid class or payload" });

  return res.status(201).json({ ok: true, quiz });
}

export async function updateMyQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quiz = await updateQuizForTeacher(userId, req.params.id, req.body ?? {});
  if (quiz === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (quiz === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, quiz });
}

export async function startMyQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await startQuizForStudent(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === false) return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
  return res.json({ ok: true, attempt: result });
}

export async function submitMyQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const score = Number(req.body?.score ?? 0);
  const result = await submitQuizForStudent(userId, req.params.id, score);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === false) return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
  return res.json({ ok: true, attempt: result });
}

export async function listMyQuizResults(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await listQuizResultsForTeacher(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, results: result });
}
