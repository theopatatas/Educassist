"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.patch("/change-password", auth_middleware_1.requireAuth, auth_controller_1.changePassword);
// protected test route
router.get("/me", auth_middleware_1.requireAuth, (req, res) => {
    return res.json({ ok: true, user: req.user });
});
exports.default = router;
