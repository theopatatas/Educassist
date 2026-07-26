import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  getMyGrades,
  getMyAcademicSessions,
  getMyClassFormOptions,
  getMyAttendance,
  publishMyGrades,
  createMyClass,
  deleteMyClass,
  listMyClasses,
  listMyClassStudents,
  saveMyAttendance,
  updateMyClass,
} from "./classes.controller";
import {
  blockTakenOverAttendance,
  blockTakenOverClassParam,
  blockTakenOverGradeSelection,
} from "../leave/takeover.middleware";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyClasses);
router.get("/meta/me", requireAuth, requireRole("teacher"), getMyClassFormOptions);
router.get(
  "/grades/me/sessions",
  requireAuth,
  requireRole("teacher", "student"),
  getMyAcademicSessions,
);
router.get("/grades/me", requireAuth, requireRole("teacher", "student"), getMyGrades);
router.post("/grades/me", requireAuth, requireRole("teacher"), blockTakenOverGradeSelection, publishMyGrades);
router.get("/attendance/me", requireAuth, requireRole("teacher", "student"), getMyAttendance);
router.post("/attendance/me", requireAuth, requireRole("teacher"), blockTakenOverAttendance, saveMyAttendance);
router.post("/me", requireAuth, requireRole("teacher"), createMyClass);
router.get("/:id/students", requireAuth, requireRole("teacher"), listMyClassStudents);
router.patch("/:id", requireAuth, requireRole("teacher"), blockTakenOverClassParam, updateMyClass);
router.delete("/:id", requireAuth, requireRole("teacher"), blockTakenOverClassParam, deleteMyClass);

export default router;
