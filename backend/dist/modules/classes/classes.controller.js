"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyClasses = listMyClasses;
exports.createMyClass = createMyClass;
exports.updateMyClass = updateMyClass;
exports.deleteMyClass = deleteMyClass;
exports.listMyClassStudents = listMyClassStudents;
exports.getMyAttendance = getMyAttendance;
exports.saveMyAttendance = saveMyAttendance;
exports.getMyGrades = getMyGrades;
exports.publishMyGrades = publishMyGrades;
const classes_service_1 = require("./classes.service");
async function listMyClasses(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const classes = role === "student" ? await (0, classes_service_1.listClassesForStudent)(userId) : await (0, classes_service_1.listClassesForTeacher)(userId);
    if (!classes) {
        return res.status(404).json({
            ok: false,
            message: role === "student" ? "Student profile not found" : "Teacher profile not found",
        });
    }
    return res.json({ ok: true, classes });
}
async function createMyClass(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const cls = await (0, classes_service_1.createClassForTeacher)(userId, req.body ?? {});
    if (!cls)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.status(201).json({ ok: true, class: cls });
}
async function updateMyClass(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, classes_service_1.updateClassForTeacher)(userId, req.params.id, req.body ?? {});
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Class not found" });
    return res.json({ ok: true, class: result });
}
async function deleteMyClass(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, classes_service_1.deleteClassForTeacher)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Class not found" });
    return res.json({ ok: true });
}
async function listMyClassStudents(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, classes_service_1.listStudentsForTeacherClass)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Class not found" });
    return res.json({ ok: true, students: result });
}
async function getMyAttendance(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (role === "student") {
        const result = await (0, classes_service_1.listAttendanceForStudent)(userId);
        if (!result)
            return res.status(404).json({ ok: false, message: "Student profile not found" });
        return res.json({ ok: true, records: result });
    }
    const result = await (0, classes_service_1.listAttendanceForTeacher)(userId, { date: req.query.date });
    if (!result)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.json({ ok: true, records: result });
}
async function saveMyAttendance(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const date = typeof req.body?.date === "string" ? req.body.date : "";
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    if (!date || records.length === 0) {
        return res.status(400).json({ ok: false, message: "date and records are required" });
    }
    const result = await (0, classes_service_1.saveAttendanceForTeacher)(userId, { date, records });
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.json({ ok: true, saved: result });
}
async function getMyGrades(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (role === "student") {
        const rows = await (0, classes_service_1.getPublishedGradesForStudent)(userId, { term: req.query.term });
        if (!rows)
            return res.status(404).json({ ok: false, message: "Student profile not found" });
        return res.json({ ok: true, rows });
    }
    const rows = await (0, classes_service_1.getPublishedGradesForTeacher)(userId, {
        section: req.query.section,
        gradeLevel: req.query.gradeLevel,
        subject: req.query.subject,
        term: req.query.term,
    });
    if (rows === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.json({ ok: true, rows });
}
async function publishMyGrades(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const body = req.body ?? {};
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!body.section || !body.gradeLevel || !body.subject || !body.term || rows.length === 0) {
        return res.status(400).json({ ok: false, message: "section, gradeLevel, subject, term, and rows are required" });
    }
    const saved = await (0, classes_service_1.savePublishedGradesForTeacher)(userId, {
        section: body.section,
        gradeLevel: body.gradeLevel,
        subject: body.subject,
        term: body.term,
        publish: !!body.publish,
        rows,
    });
    if (saved === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (saved === false)
        return res.status(404).json({ ok: false, message: "Class not found for selected filters" });
    return res.json({ ok: true, saved });
}
