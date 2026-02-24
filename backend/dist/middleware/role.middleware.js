"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user?.role)
            return res.status(401).json({ ok: false, message: "Unauthorized" });
        if (!roles.includes(user.role))
            return res.status(403).json({ ok: false, message: "Forbidden" });
        return next();
    };
}
