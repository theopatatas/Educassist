import type { Request, Response } from "express";
import {
  generateLessonDraft,
  generateQuizDraft,
  lessonPlanDocx,
  lessonPlanPdf,
  listLessonPlans,
  regenerateLessonSection,
  regenerateQuizQuestion,
  saveLessonPlan,
} from "./teacher-assistant.service";

const userId = (req: Request) => String(req.user?.sub ?? "");

function missingText(body: Record<string, unknown>, fields: string[]) {
  return fields.some((field) => !String(body[field] ?? "").trim());
}

function generationError(res: Response, error: unknown) {
  const message =
    error instanceof Error && error.message === "AI_GENERATION_UNAVAILABLE"
      ? "AI content generation is unavailable. Configure the AI provider and try again."
      : "AI could not generate valid educational content. Please try again.";
  return res.status(503).json({ ok: false, message });
}

export async function generateQuiz(req: Request, res: Response) {
  if (
    missingText(req.body ?? {}, [
      "subject",
      "gradeLevel",
      "topic",
      "objectives",
    ]) ||
    !Array.isArray(req.body?.questionTypes) ||
    req.body.questionTypes.length === 0
  ) {
    return res.status(400).json({
      ok: false,
      message: "Subject, grade level, topic, objectives, and question types are required.",
    });
  }
  try {
    return res.json({ ok: true, draft: await generateQuizDraft(req.body ?? {}) });
  } catch (error) {
    return generationError(res, error);
  }
}

export async function regenerateQuestion(req: Request, res: Response) {
  try {
    return res.json({
      ok: true,
      question: await regenerateQuizQuestion(req.body ?? {}),
    });
  } catch (error) {
    return generationError(res, error);
  }
}

export async function generateLesson(req: Request, res: Response) {
  if (
    missingText(req.body ?? {}, [
      "subject",
      "gradeLevel",
      "topic",
      "objectives",
    ])
  ) {
    return res.status(400).json({
      ok: false,
      message: "Subject, grade level, topic, and objectives are required.",
    });
  }
  try {
    return res.json({
      ok: true,
      draft: await generateLessonDraft(req.body ?? {}),
    });
  } catch (error) {
    return generationError(res, error);
  }
}

export async function regenerateSection(req: Request, res: Response) {
  try {
    return res.json({
      ok: true,
      section: await regenerateLessonSection(req.body ?? {}),
    });
  } catch (error) {
    return generationError(res, error);
  }
}

export async function getLessonPlans(req: Request, res: Response) {
  const plans = await listLessonPlans(userId(req));
  if (!plans)
    return res.status(404).json({ ok: false, message: "Teacher not found" });
  return res.json({ ok: true, plans });
}

export async function createLessonPlan(req: Request, res: Response) {
  const plan = await saveLessonPlan(userId(req), req.body ?? {});
  if (!plan)
    return res.status(400).json({ ok: false, message: "Invalid lesson plan" });
  return res.status(201).json({ ok: true, plan });
}

export async function updateLessonPlan(req: Request, res: Response) {
  const plan = await saveLessonPlan(userId(req), req.body ?? {}, req.params.id);
  if (!plan)
    return res.status(404).json({ ok: false, message: "Lesson plan not found" });
  return res.json({ ok: true, plan });
}

export async function exportLessonPdf(req: Request, res: Response) {
  const file = await lessonPlanPdf(userId(req), req.params.id);
  if (!file)
    return res.status(404).json({ ok: false, message: "Lesson plan not found" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="lesson-plan.pdf"`);
  return res.send(file);
}

export async function exportLessonDocx(req: Request, res: Response) {
  const file = await lessonPlanDocx(userId(req), req.params.id);
  if (!file)
    return res.status(404).json({ ok: false, message: "Lesson plan not found" });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", `attachment; filename="lesson-plan.docx"`);
  return res.send(file);
}
