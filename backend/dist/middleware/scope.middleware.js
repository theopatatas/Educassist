"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherOwnsClass = teacherOwnsClass;
exports.studentEnrolledInClass = studentEnrolledInClass;
const models_1 = require("../db/models"); // adjust to your models export
function teacherOwnsClass(paramName = "id") {
    return async (req, res, next) => {
        const classId = req.params[paramName];
        const userId = req.user?.sub;
        const cls = await models_1.Class.findByPk(classId);
        if (!cls)
            return res.status(404).json({ ok: false, message: "Class not found" });
        if (String(cls.teacherId) !== String(userId)) {
            return res.status(403).json({ ok: false, message: "Forbidden (not your class)" });
        }
        req.class = cls;
        return next();
    };
}
function studentEnrolledInClass(paramName = "id") {
    return async (req, res, next) => {
        const classId = req.params[paramName];
        const userId = req.user?.sub;
        const enr = await models_1.Enrollment.findOne({ where: { classId, studentId: userId } });
        if (!enr)
            return res.status(403).json({ ok: false, message: "Not enrolled in class" });
        return next();
    };
}
