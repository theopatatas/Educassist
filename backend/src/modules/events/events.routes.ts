import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { clearAllNotifications, create, dashboard, list, notifications, readAllNotifications, readNotification, remove, update } from "./events.controller";
const router = Router();
router.get(
  "/dashboard",
  requireAuth,
  requireRole("admin", "managed_admin"),
  dashboard,
);
router.get(
  "/notifications",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  notifications,
);
router.patch(
  "/notifications/read-all",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  readAllNotifications,
);
router.patch(
  "/notifications/:id/read",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  readNotification,
);
router.delete(
  "/notifications/clear-all",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  clearAllNotifications,
);
router.get(
  "/",
  requireAuth,
  requireRole("admin", "managed_admin", "teacher", "student", "parent"),
  list,
);
router.post(
  "/",
  requireAuth,
  requireRole("admin", "managed_admin"),
  create,
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "managed_admin"),
  update,
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin", "managed_admin"),
  remove,
);
export default router;
