"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const admin_controller_1 = require("./admin.controller");
const router = (0, express_1.Router)();
router.get("/overview", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), admin_controller_1.overview);
exports.default = router;
