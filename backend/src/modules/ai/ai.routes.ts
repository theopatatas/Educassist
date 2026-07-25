import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { chatWithAI, chatWithAttachments } from "./ai.controller";
import { aiAttachmentUpload } from "./ai.upload";

const router = Router();

router.post(
  "/chat",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  chatWithAI,
);

router.post(
  "/chat/attachments",
  requireAuth,
  requireRole("teacher"),
  aiAttachmentUpload.array("attachments", 5),
  chatWithAttachments,
);

export default router;
