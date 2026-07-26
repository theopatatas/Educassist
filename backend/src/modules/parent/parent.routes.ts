import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  academicRecord,
  academicSessions,
  create,
  getById,
  list,
  me,
  overview,
  remove,
  update,
} from "./parent.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("parent"), me);
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
router.get("/", requireAuth, requireRole("admin"), list);
router.get("/:id", requireAuth, requireRole("admin"), getById);
router.post("/", requireAuth, requireRole("admin"), create);
router.patch("/:id", requireAuth, requireRole("admin"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);

export default router;
