"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.me = me;
exports.update = update;
exports.remove = remove;
exports.listSubjects = listSubjects;
exports.addSubject = addSubject;
exports.addTeachingLoad = addTeachingLoad;
const teacher_service_1 = require("./teacher.service");
async function create(req, res) {
    if (!req.body?.employeeNumber) {
        return res.status(400).json({ ok: false, message: "Employee number is required" });
    }
    const result = await (0, teacher_service_1.createTeacher)(req.body);
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.status(201).json(result);
}
async function list(req, res) {
    const teachers = await (0, teacher_service_1.listTeachers)();
    return res.json({ ok: true, teachers });
}
async function getById(req, res) {
    const teacher = await (0, teacher_service_1.getTeacherById)(req.params.id);
    if (!teacher)
        return res.status(404).json({ ok: false, message: "Teacher not found" });
    return res.json({ ok: true, teacher });
}
async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const teacher = await (0, teacher_service_1.getTeacherByUserId)(userId);
    if (!teacher)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.json({ ok: true, teacher });
}
async function update(req, res) {
    const teacher = await (0, teacher_service_1.updateTeacher)(req.params.id, req.body ?? {});
    if (!teacher)
        return res.status(404).json({ ok: false, message: "Teacher not found" });
    return res.json({ ok: true, teacher });
}
async function remove(req, res) {
    const ok = await (0, teacher_service_1.deleteTeacher)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "Teacher not found" });
    return res.json({ ok: true });
}
async function listSubjects(req, res) {
    const subjects = await (0, teacher_service_1.listTeacherSubjects)(req.params.id);
    return res.json({ ok: true, subjects });
}
async function addSubject(req, res) {
    const { name } = req.body ?? {};
    if (!name)
        return res.status(400).json({ ok: false, message: "Subject name is required" });
    const result = await (0, teacher_service_1.addSubjectForTeacher)(req.params.id, { name });
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.status(201).json(result);
}
async function addTeachingLoad(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (entries.length === 0) {
        return res.status(400).json({ ok: false, message: "Entries are required" });
    }
    const result = await (0, teacher_service_1.addTeachingLoadForTeacher)(userId, entries);
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.json({ ok: true });
}
