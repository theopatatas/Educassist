import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  academicRecord,
  academicSessions,
  disciplinaryRecords,
  create,
  getById,
  list,
  linkedStudents,
  me,
  overview,
  remove,
  update,
} from "./parent.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("parent"), me);
router.get(
  "/students",
  requireAuth,
  requireRole("parent"),
  linkedStudents,
);
router.get("/overview", requireAuth, requireRole("parent"), overview);
router.get(
  "/academic-sessions",
  requireAuth,
  requireRole("parent"),
  academicSessions,
);
router.get(
  "/academic-record",
  requireAuth,
  requireRole("parent"),
  academicRecord,
);
router.get(
  "/disciplinary-records",
  requireAuth,
  requireRole("parent"),
  disciplinaryRecords,
);
router.get("/", requireAuth, requireRole("admin"), list);
router.get("/:id", requireAuth, requireRole("admin"), getById);
router.post("/", requireAuth, requireRole("admin"), create);
router.patch("/:id", requireAuth, requireRole("admin"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);

export default router;
