"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/register/request-otp", auth_controller_1.requestRegisterOtp);
router.post("/register/verify-otp", auth_controller_1.verifyRegisterOtp);
router.post("/login", auth_controller_1.login);
router.post("/refresh", auth_controller_1.refreshSession);
router.post("/forgot-password/request-otp", auth_controller_1.requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", auth_controller_1.verifyPasswordResetOtp);
router.post("/forgot-password/reset", auth_controller_1.resetPasswordWithOtp);
router.patch("/change-password", auth_middleware_1.requireAuth, auth_controller_1.changePassword);
router.post("/verify-password", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin", "managed_admin"), auth_controller_1.verifyPassword);
// protected test route
router.get("/me", auth_middleware_1.requireAuth, (req, res) => {
    return res.json({ ok: true, user: req.user });
});
exports.default = router;
