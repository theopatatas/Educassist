"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_1 = require("../utils/jwt");
const takeover_context_1 = require("../modules/leave/takeover-context");
async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }
    const token = header.slice("Bearer ".length);
    try {
        req.user = (0, jwt_1.verifyAccessToken)(token);
    }
    catch {
        return res.status(401).json({ ok: false, message: "Invalid or expired token" });
    }
    if (!(await (0, takeover_context_1.applyActiveTakeoverContext)(req, res)))
        return;
    return next();
}
exports.default = requireAuth;
