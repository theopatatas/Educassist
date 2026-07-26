import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  activateTakeover,
  activities,
  allLeaves,
  approveLeave,
  audits,
  cancelLeave,
  cancelTakeover,
  editLeave,
  emergencyTakeover,
  endTakeover,
  myLeaves,
  notifications,
  clearAllNotifications,
  readAllNotifications,
  readNotification,
  rejectLeave,
  submitLeave,
  takeoverAssignment,
  takeoverAttendance,
  takeoverGrades,
  takeoverWorkspace,
  updateTakeoverGrades,
} from "./leave.controller";
import { leaveAttachmentUpload } from "./leave.upload";

const router = Router();

router.get("/notifications", requireAuth, notifications);
router.patch("/notifications/read-all", requireAuth, readAllNotifications);
router.patch("/notifications/:id/read", requireAuth, readNotification);
router.delete("/notifications/clear-all", requireAuth, clearAllNotifications);

router.get("/teacher", requireAuth, requireRole("teacher"), myLeaves);
router.post("/teacher", requireAuth, requireRole("teacher"), leaveAttachmentUpload.single("attachment"), submitLeave);
router.patch("/teacher/:id", requireAuth, requireRole("teacher"), leaveAttachmentUpload.single("attachment"), editLeave);
router.patch("/teacher/:id/cancel", requireAuth, requireRole("teacher"), cancelLeave);
router.get("/:id/activities", requireAuth, requireRole("admin", "teacher"), activities);

router.get("/admin", requireAuth, requireRole("admin"), allLeaves);
router.post("/admin/emergency", requireAuth, requireRole("admin"), emergencyTakeover);
router.get("/admin/:id/audits", requireAuth, requireRole("admin"), audits);
router.patch("/admin/:id/approve", requireAuth, requireRole("admin"), approveLeave);
router.patch("/admin/:id/reject", requireAuth, requireRole("admin"), rejectLeave);
router.patch("/admin/:id/takeover/start", requireAuth, requireRole("admin"), activateTakeover);
router.patch("/admin/:id/takeover/end", requireAuth, requireRole("admin"), endTakeover);
router.patch("/admin/:id/takeover/cancel", requireAuth, requireRole("admin"), cancelTakeover);
router.get("/admin/:id/workspace", requireAuth, requireRole("admin"), takeoverWorkspace);
router.post("/admin/:id/workspace/attendance", requireAuth, requireRole("admin"), takeoverAttendance);
router.post("/admin/:id/workspace/assignments", requireAuth, requireRole("admin"), takeoverAssignment);
router.get("/admin/:id/workspace/grades", requireAuth, requireRole("admin"), takeoverGrades);
router.post("/admin/:id/workspace/grades", requireAuth, requireRole("admin"), updateTakeoverGrades);

export default router;
