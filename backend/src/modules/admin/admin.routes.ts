import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  createAdminSubject,
  listAdminSubjects,
  overview,
} from "./admin.controller";
import {
  deleteLogo,
  getSettings,
  updateSettingsSection,
  uploadLogo,
} from "./settings.controller";
import { schoolLogoUpload } from "./settings.upload";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin"), overview);
router.get("/subjects", requireAuth, requireRole("admin"), listAdminSubjects);
router.post("/subjects", requireAuth, requireRole("admin"), createAdminSubject);
router.get("/settings", requireAuth, requireRole("admin"), getSettings);
router.patch(
  "/settings/:section",
  requireAuth,
  requireRole("admin"),
  updateSettingsSection,
);
router.post(
  "/settings/branding/logo",
  requireAuth,
  requireRole("admin"),
  schoolLogoUpload.single("logo"),
  uploadLogo,
);
router.delete(
  "/settings/branding/logo",
  requireAuth,
  requireRole("admin"),
  deleteLogo,
);

export default router;
