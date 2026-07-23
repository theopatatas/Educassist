"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const Student_model_1 = require("../db/models/Student.model");
function requireRole(...roles) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user?.role)
            return res.status(401).json({ ok: false, message: "Unauthorized" });
        const allowed = user.role === "super_admin"
            ? roles.includes("admin")
            : user.role === "admin"
                ? roles.includes("managed_admin")
                : roles.includes(user.role);
        if (!allowed)
            return res.status(403).json({ ok: false, message: "Forbidden" });
        if (user.role === "student" && user.sub) {
            const student = await Student_model_1.Student.findOne({
                where: { userId: user.sub },
                attributes: ["graduatedAt"],
            });
            if (student?.graduatedAt) {
                const allowedGraduateRoutes = new Set([
                    "/api/students/me",
                    "/api/classes/grades/me",
                    "/api/ai/chat",
                ]);
                if (!allowedGraduateRoutes.has(req.originalUrl.split("?")[0])) {
                    return res.status(403).json({
                        ok: false,
                        code: "GRADUATED_READ_ONLY",
                        message: "Graduated accounts can only view grades",
                    });
                }
            }
        }
        return next();
    };
}
