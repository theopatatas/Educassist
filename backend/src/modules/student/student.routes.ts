import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  create,
  academicRecord,
  attendanceHistory,
  getById,
  list,
  me,
  overview,
  promote,
  remove,
  undoPromotion,
  update,
} from "./student.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("student"), me);
router.get("/", requireAuth, requireRole("admin", "managed_admin", "teacher"), list);
router.get("/:id/overview", requireAuth, requireRole("admin", "managed_admin"), overview);
router.get(
  "/:id/academic-record",
  requireAuth,
  requireRole("admin", "managed_admin"),
  academicRecord,
);
router.get(
  "/:id/attendance",
  requireAuth,
  requireRole("admin", "managed_admin"),
  attendanceHistory,
);
router.get("/:id", requireAuth, requireRole("admin", "managed_admin", "teacher"), getById);
router.post("/", requireAuth, requireRole("admin", "managed_admin"), create);
router.patch("/:id", requireAuth, requireRole("admin", "managed_admin"), update);
router.patch("/:id/promote", requireAuth, requireRole("admin", "managed_admin"), promote);
router.patch(
  "/:id/promotion/undo",
  requireAuth,
  requireRole("admin", "managed_admin"),
  undoPromotion,
);
router.delete("/:id", requireAuth, requireRole("admin", "managed_admin"), remove);

export default router;
