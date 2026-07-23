import { Router } from "express";
import {
  changePassword,
  login,
  refreshSession,
  register,
  requestRegisterOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
  verifyRegisterOtp,
  verifyPassword,
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

router.post("/register", register);
router.post("/register/request-otp", requestRegisterOtp);
router.post("/register/verify-otp", verifyRegisterOtp);
router.post("/login", login);
router.post("/refresh", refreshSession);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", verifyPasswordResetOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);
router.patch("/change-password", requireAuth, changePassword);
router.post("/verify-password", requireAuth, requireRole("admin", "managed_admin"), verifyPassword);

// protected test route
router.get("/me", requireAuth, (req: any, res) => {
  return res.json({ ok: true, user: req.user });
});

export default router;
