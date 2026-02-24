"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.me = me;
exports.update = update;
exports.remove = remove;
const student_service_1 = require("./student.service");
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
    const student = await (0, student_service_1.getStudentById)(req.params.id);
    if (!student)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, student });
}
async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const student = await (0, student_service_1.getStudentByUserId)(userId);
    if (!student)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    return res.json({ ok: true, student });
}
async function update(req, res) {
    const student = await (0, student_service_1.updateStudent)(req.params.id, req.body ?? {});
    if (!student)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true, student });
}
async function remove(req, res) {
    const ok = await (0, student_service_1.deleteStudent)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "Student not found" });
    return res.json({ ok: true });
}
