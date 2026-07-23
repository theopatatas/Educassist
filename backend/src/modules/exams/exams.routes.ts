import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createMyExam, deleteMyExam, listMyExams, updateMyExam } from "./exams.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyExams);
router.post("/me", requireAuth, requireRole("teacher"), createMyExam);
router.patch("/:id", requireAuth, requireRole("teacher"), updateMyExam);
router.delete("/:id", requireAuth, requireRole("teacher"), deleteMyExam);

export default router;
