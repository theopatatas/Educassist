import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  getMyGrades,
  getMyAttendance,
  publishMyGrades,
  createMyClass,
  deleteMyClass,
  listMyClasses,
  listMyClassStudents,
  saveMyAttendance,
  updateMyClass,
} from "./classes.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher", "student"), listMyClasses);
router.get("/grades/me", requireAuth, requireRole("teacher", "student"), getMyGrades);
router.post("/grades/me", requireAuth, requireRole("teacher"), publishMyGrades);
router.get("/attendance/me", requireAuth, requireRole("teacher", "student"), getMyAttendance);
router.post("/attendance/me", requireAuth, requireRole("teacher"), saveMyAttendance);
router.post("/me", requireAuth, requireRole("teacher"), createMyClass);
router.get("/:id/students", requireAuth, requireRole("teacher"), listMyClassStudents);
router.patch("/:id", requireAuth, requireRole("teacher"), updateMyClass);
router.delete("/:id", requireAuth, requireRole("teacher"), deleteMyClass);

export default router;
