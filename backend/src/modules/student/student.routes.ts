import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { create, getById, list, me, overview, remove, update } from "./student.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("student"), me);
router.get("/", requireAuth, requireRole("admin", "teacher"), list);
router.get("/:id/overview", requireAuth, requireRole("admin"), overview);
router.get("/:id", requireAuth, requireRole("admin", "teacher"), getById);
router.post("/", requireAuth, requireRole("admin"), create);
router.patch("/:id", requireAuth, requireRole("admin"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);

export default router;
