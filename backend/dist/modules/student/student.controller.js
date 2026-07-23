"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.academicRecord = academicRecord;
exports.attendanceHistory = attendanceHistory;
exports.overview = overview;
exports.me = me;
exports.update = update;
exports.promote = promote;
exports.undoPromotion = undoPromotion;
exports.remove = remove;
const student_service_1 = require("./student.service");
const errors_1 = require("../../utils/errors");
async function create(req, res) {
    const result = await (0, student_service_1.createStudent)(req.body);
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.status(201).json(result);
}
async function list(req, res) {
    const students = await (0, student_service_1.listStudents)();
    return res.json({ ok: true, students });
}
async function getById(req, res) {
    const student = await (0, student_service_1.getStudentDetailsById)(req.params.id);
    if (!student)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, student });
}
async function academicRecord(req, res) {
    const record = await (0, student_service_1.getStudentAcademicRecordById)(req.params.id);
    if (!record)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, record });
}
async function attendanceHistory(req, res) {
    const attendance = await (0, student_service_1.getStudentAttendanceHistoryById)(req.params.id);
    if (!attendance)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, attendance });
}
async function overview(req, res) {
    const data = await (0, student_service_1.getStudentOverviewById)(req.params.id);
    if (!data)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, overview: data });
}
async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const student = await (0, student_service_1.getStudentByUserId)(userId);
    if (!student)
        return res
            .status(404)
            .json({ ok: false, message: "Student profile not found" });
    return res.json({ ok: true, student });
}
async function update(req, res) {
    try {
        const student = await (0, student_service_1.updateStudent)(req.params.id, req.body ?? {});
        if (!student)
            return res.status(404).json({ ok: false, message: "Student not found" });
        return res.json({ ok: true, student });
    }
    catch (error) {
        if ((0, errors_1.hasErrorName)(error, "SequelizeUniqueConstraintError")) {
            return res
                .status(409)
                .json({ ok: false, message: "Email is already in use" });
        }
        throw error;
    }
}
async function promote(req, res) {
    const result = await (0, student_service_1.promoteStudent)(req.params.id);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
}
async function undoPromotion(req, res) {
    const result = await (0, student_service_1.undoStudentPromotion)(req.params.id);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
}
async function remove(req, res) {
    const ok = await (0, student_service_1.deleteStudent)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true });
}
