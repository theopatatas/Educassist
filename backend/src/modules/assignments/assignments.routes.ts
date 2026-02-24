import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  createMyAssignment,
  listMyAssignmentResults,
  listMyAssignments,
  submitMyAssignment,
} from "./assignments.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyAssignments);
router.post("/me", requireAuth, requireRole("teacher"), createMyAssignment);
router.get("/:id/results", requireAuth, requireRole("teacher"), listMyAssignmentResults);
router.post("/:id/submit", requireAuth, requireRole("student"), submitMyAssignment);

export default router;
