import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  create,
  deleteMyProfilePhoto,
  getById,
  getMe,
  list,
  remove,
  update,
  updateMe,
  uploadMyProfilePhoto,
  activities,
} from "./users.controller";
import { profilePhotoUpload } from "./users.upload";

const router = Router();

router.get("/me", requireAuth, requireRole("admin", "managed_admin"), getMe);
router.patch(
  "/me",
  requireAuth,
  requireRole("admin", "managed_admin"),
  updateMe,
);
router.post(
  "/me/profile-photo",
  requireAuth,
  requireRole("admin", "managed_admin"),
  profilePhotoUpload.single("photo"),
  uploadMyProfilePhoto,
);
router.delete(
  "/me/profile-photo",
  requireAuth,
  requireRole("admin", "managed_admin"),
  deleteMyProfilePhoto,
);
router.use(requireAuth, requireRole("admin"));
router.get("/", list);
router.post("/", create);
router.get("/:id", getById);
router.get("/:id/activities", activities);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
