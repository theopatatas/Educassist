"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const ai_controller_1 = require("./ai.controller");
const router = (0, express_1.Router)();
router.post("/chat", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("teacher"), ai_controller_1.chatWithAI);
exports.default = router;
