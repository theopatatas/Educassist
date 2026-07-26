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
  academicAuditLogs,
  gradeSubmissionProgress,
  getCurrentAcademicContext,
  getSettings,
  updateGradeEncodingStatus,
  updateSettingsSection,
  unlockPublishedGrades,
  uploadLogo,
} from "./settings.controller";
import { schoolLogoUpload } from "./settings.upload";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin"), overview);
router.get(
  "/settings/academic-context",
  requireAuth,
  getCurrentAcademicContext,
);
router.get(
  "/settings/academic/progress",
  requireAuth,
  requireRole("admin", "managed_admin"),
  gradeSubmissionProgress,
);
router.get(
  "/settings/academic/audits",
  requireAuth,
  requireRole("admin"),
  academicAuditLogs,
);
router.get("/subjects", requireAuth, requireRole("admin"), listAdminSubjects);
router.post("/subjects", requireAuth, requireRole("admin"), createAdminSubject);
router.get("/settings", requireAuth, requireRole("admin"), getSettings);
router.patch(
  "/settings/:section",
  requireAuth,
  requireRole("admin"),
  updateSettingsSection,
);
router.patch(
  "/settings/academic/encoding-status",
  requireAuth,
  requireRole("admin"),
  updateGradeEncodingStatus,
);
router.patch(
  "/settings/academic/grade-items/:gradeItemId/unlock",
  requireAuth,
  requireRole("admin"),
  unlockPublishedGrades,
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
