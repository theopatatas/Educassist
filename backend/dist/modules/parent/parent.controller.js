"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.me = me;
exports.linkedStudents = linkedStudents;
exports.overview = overview;
exports.academicSessions = academicSessions;
exports.academicRecord = academicRecord;
exports.disciplinaryRecords = disciplinaryRecords;
exports.update = update;
exports.remove = remove;
const parent_service_1 = require("./parent.service");
const student_disciplinary_service_1 = require("../student/student-disciplinary.service");
async function create(req, res) {
    const result = await (0, parent_service_1.createParent)(req.body);
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.status(201).json(result);
}
async function list(req, res) {
    const parents = await (0, parent_service_1.listParents)();
    return res.json({ ok: true, parents });
}
async function getById(req, res) {
    const parent = await (0, parent_service_1.getParentById)(req.params.id);
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true, parent });
}
async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const parent = await (0, parent_service_1.getParentByUserId)(userId);
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent profile not found" });
    const linkedStudents = await (0, parent_service_1.getParentLinkedStudentsByUserId)(userId);
    const primaryStudent = linkedStudents?.find((student) => student.primary) ??
        linkedStudents?.[0] ??
        null;
    return res.json({
        ok: true,
        parent: {
            ...parent.toJSON(),
            studentName: primaryStudent?.name ?? null,
            linkedStudentCount: linkedStudents?.length ?? 0,
        },
    });
}
async function linkedStudents(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const students = await (0, parent_service_1.getParentLinkedStudentsByUserId)(userId);
    if (students === null)
        return res
            .status(404)
            .json({ ok: false, message: "Parent profile not found" });
    return res.json({ ok: true, students });
}
async function overview(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const data = await (0, parent_service_1.getParentOverviewByUserId)(userId, typeof req.query.studentId === "string" ? req.query.studentId : undefined);
    if (data === null)
        return res.status(404).json({ ok: false, message: "Parent profile not found" });
    if ("forbidden" in data)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    return res.json({ ok: true, overview: data });
}
async function academicSessions(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const sessions = await (0, parent_service_1.getParentAcademicSessionsByUserId)(userId, typeof req.query.studentId === "string" ? req.query.studentId : undefined);
    if (sessions === null)
        return res
            .status(404)
            .json({ ok: false, message: "Parent profile not found" });
    if (!Array.isArray(sessions) && "forbidden" in sessions)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    return res.json({ ok: true, sessions });
}
async function academicRecord(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const data = await (0, parent_service_1.getParentAcademicRecordByUserId)(userId, {
        studentId: typeof req.query.studentId === "string"
            ? req.query.studentId
            : undefined,
        academicYear: typeof req.query.academicYear === "string"
            ? req.query.academicYear
            : undefined,
        gradeLevel: typeof req.query.gradeLevel === "string"
            ? req.query.gradeLevel
            : undefined,
    });
    if (data === null)
        return res
            .status(404)
            .json({ ok: false, message: "Parent profile not found" });
    if ("forbidden" in data)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    return res.json({ ok: true, ...data });
}
async function disciplinaryRecords(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const studentId = typeof req.query.studentId === "string"
        ? Number(req.query.studentId)
        : Number.NaN;
    if (!Number.isInteger(studentId) || studentId <= 0)
        return res
            .status(400)
            .json({ ok: false, message: "A linked student is required." });
    const selected = await (0, parent_service_1.getParentSelectedStudentByUserId)(userId, String(studentId));
    if (selected === null)
        return res
            .status(404)
            .json({ ok: false, message: "Parent profile not found" });
    if ("forbidden" in selected || !selected.student)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    const result = await (0, student_disciplinary_service_1.listStudentDisciplinaryRecords)(studentId, {
        academicYear: typeof req.query.academicYear === "string"
            ? req.query.academicYear
            : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
        incidentType: typeof req.query.incidentType === "string"
            ? req.query.incidentType
            : undefined,
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
    });
    if (!result)
        return res.status(404).json({ ok: false, message: "Student not found." });
    return res.json({ ok: true, ...result });
}
async function update(req, res) {
    const parent = await (0, parent_service_1.updateParent)(req.params.id, req.body ?? {});
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true, parent });
}
async function remove(req, res) {
    const ok = await (0, parent_service_1.deleteParent)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true });
}
