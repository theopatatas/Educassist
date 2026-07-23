import type { Request, Response } from "express";
import {
  createQuizForTeacher,
  getQuizAnalyticsForTeacher,
  getQuizDetailForStudent,
  getQuizDetailForTeacher,
  leaveQuizForStudent,
  listQuizzesForStudent,
  listQuizResultsForTeacher,
  listQuizzesForTeacher,
  saveQuizQuestionsForTeacher,
  startQuizForStudent,
  submitQuizForStudent,
  updateQuizForTeacher,
} from "./quizzes.service";

export async function listMyQuizzes(req: Request, res: Response) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quizzes = role === "student" ? await listQuizzesForStudent(userId) : await listQuizzesForTeacher(userId);
  if (!quizzes) {
    return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
  }
  return res.json({ ok: true, quizzes });
}

export async function createMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quiz = await createQuizForTeacher(userId, req.body ?? {});
  if (quiz === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (quiz === "past_date") return res.status(400).json({ ok: false, message: "You cannot create a quiz with a past date." });
  if (quiz === false) return res.status(400).json({ ok: false, message: "Invalid class or payload" });

  return res.status(201).json({ ok: true, quiz });
}

export async function getMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result =
    role === "student" ? await getQuizDetailForStudent(userId, req.params.id) : await getQuizDetailForTeacher(userId, req.params.id);
  if (result === null) {
    return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
  }
  if (result === "closed") {
    return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
  }
  if (result === false) {
    return res.status(404).json({ ok: false, message: "Quiz not found" });
  }
  return res.json({ ok: true, quiz: result });
}

export async function updateMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quiz = await updateQuizForTeacher(userId, req.params.id, req.body ?? {});
  if (quiz === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (quiz === "past_date") return res.status(400).json({ ok: false, message: "You cannot create a quiz with a past date." });
  if (quiz === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, quiz });
}

export async function saveMyQuizQuestions(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const quiz = await saveQuizQuestionsForTeacher(userId, req.params.id, req.body?.questions ?? []);
  if (quiz === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (quiz === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, quiz });
}

export async function startMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await startQuizForStudent(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === "closed") {
    return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
  }
  if (result === false) return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
  return res.json({ ok: true, attempt: result });
}

export async function submitMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await submitQuizForStudent(userId, req.params.id, req.body?.answers ?? []);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === "closed") {
    return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
  }
  if (result === false) return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
  return res.json({ ok: true, ...result });
}

export async function leaveMyQuiz(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await leaveQuizForStudent(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === false) return res.status(400).json({ ok: false, message: "Quiz is not in an active attempt." });
  return res.json({ ok: true, ...result });
}

export async function listMyQuizResults(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await listQuizResultsForTeacher(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, results: result });
}

export async function getMyQuizAnalytics(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await getQuizAnalyticsForTeacher(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Quiz not found" });
  return res.json({ ok: true, analytics: result });
}
