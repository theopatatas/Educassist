"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_1 = require("../utils/jwt");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload; // or req.user if you typed it
        return next();
    }
    catch {
        return res.status(401).json({ ok: false, message: "Invalid or expired token" });
    }
}
exports.default = requireAuth;
