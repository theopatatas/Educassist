import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  addSubject,
  addTeachingLoad,
  create,
  getById,
  list,
  listSubjects,
  me,
  remove,
  update,
} from "./teacher.controller";

const router = Router();

router.get("/me", requireAuth, requireRole("teacher"), me);
router.get("/", requireAuth, requireRole("admin"), list);
router.get("/:id", requireAuth, requireRole("admin"), getById);
router.post("/", requireAuth, requireRole("admin"), create);
router.patch("/:id", requireAuth, requireRole("admin"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);
router.get("/:id/subjects", requireAuth, requireRole("admin"), listSubjects);
router.post("/:id/subjects", requireAuth, requireRole("admin"), addSubject);
router.post("/me/teaching-load", requireAuth, requireRole("teacher"), addTeachingLoad);

export default router;
