import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  createMyQuiz,
  listMyQuizResults,
  listMyQuizzes,
  startMyQuiz,
  submitMyQuiz,
  updateMyQuiz,
} from "./quizzes.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyQuizzes);
router.post("/me", requireAuth, requireRole("teacher"), createMyQuiz);
router.patch("/:id", requireAuth, requireRole("teacher"), updateMyQuiz);
router.get("/:id/results", requireAuth, requireRole("teacher"), listMyQuizResults);
router.post("/:id/start", requireAuth, requireRole("student"), startMyQuiz);
router.post("/:id/submit", requireAuth, requireRole("student"), submitMyQuiz);

export default router;
