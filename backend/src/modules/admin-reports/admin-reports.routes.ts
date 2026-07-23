import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { exportReport, preview } from "./admin-reports.controller";

const router = Router();
router.use(requireAuth, requireRole("admin", "managed_admin"));
router.get("/:type", preview);
router.get("/:type/export", exportReport);
export default router;
