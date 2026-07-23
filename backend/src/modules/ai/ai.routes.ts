import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { chatWithAI } from "./ai.controller";

const router = Router();

router.post(
  "/chat",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  chatWithAI,
);

export default router;
