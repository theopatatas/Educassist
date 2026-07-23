import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  createMyQuiz,
  getMyQuiz,
  getMyQuizAnalytics,
  leaveMyQuiz,
  listMyQuizResults,
  listMyQuizzes,
  saveMyQuizQuestions,
  startMyQuiz,
  submitMyQuiz,
  updateMyQuiz,
} from "./quizzes.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyQuizzes);
router.post("/me", requireAuth, requireRole("teacher"), createMyQuiz);
router.get("/:id", requireAuth, requireRole("teacher", "student"), getMyQuiz);
router.patch("/:id", requireAuth, requireRole("teacher"), updateMyQuiz);
router.put("/:id/questions", requireAuth, requireRole("teacher"), saveMyQuizQuestions);
router.get("/:id/results", requireAuth, requireRole("teacher"), listMyQuizResults);
router.get("/:id/analytics", requireAuth, requireRole("teacher"), getMyQuizAnalytics);
router.post("/:id/start", requireAuth, requireRole("student"), startMyQuiz);
router.post("/:id/leave", requireAuth, requireRole("student"), leaveMyQuiz);
router.post("/:id/submit", requireAuth, requireRole("student"), submitMyQuiz);

export default router;
