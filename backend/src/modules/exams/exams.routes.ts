import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createMyExam, deleteMyExam, listMyExams, updateMyExam } from "./exams.controller";
import {
  blockTakenOverBodyClass,
  blockTakenOverExam,
} from "../leave/takeover.middleware";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyExams);
router.post("/me", requireAuth, requireRole("teacher"), blockTakenOverBodyClass, createMyExam);
router.patch("/:id", requireAuth, requireRole("teacher"), blockTakenOverExam, updateMyExam);
router.delete("/:id", requireAuth, requireRole("teacher"), blockTakenOverExam, deleteMyExam);

export default router;
