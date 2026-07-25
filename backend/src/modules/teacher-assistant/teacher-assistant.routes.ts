import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  createLessonPlan,
  exportLessonDocx,
  exportLessonPdf,
  generateLesson,
  generateQuiz,
  getLessonPlans,
  regenerateQuestion,
  regenerateSection,
  updateLessonPlan,
} from "./teacher-assistant.controller";

const router = Router();
router.use(requireAuth, requireRole("teacher"));
router.post("/quiz/generate", generateQuiz);
router.post("/quiz/regenerate-question", regenerateQuestion);
router.post("/lesson/generate", generateLesson);
router.post("/lesson/regenerate-section", regenerateSection);
router.get("/lesson-plans", getLessonPlans);
router.post("/lesson-plans", createLessonPlan);
router.patch("/lesson-plans/:id", updateLessonPlan);
router.get("/lesson-plans/:id/pdf", exportLessonPdf);
router.get("/lesson-plans/:id/docx", exportLessonDocx);

export default router;
