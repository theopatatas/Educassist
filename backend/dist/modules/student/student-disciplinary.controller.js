"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDisciplinary = listDisciplinary;
exports.createDisciplinary = createDisciplinary;
exports.updateDisciplinary = updateDisciplinary;
const student_disciplinary_service_1 = require("./student-disciplinary.service");
function context(req) {
    return {
        userId: Number(req.user?.sub),
        role: String(req.user?.role ?? "super_admin"),
        ipAddress: req.ip,
        deviceInfo: req.get("user-agent") ?? null,
    };
}
async function listDisciplinary(req, res) {
    const result = await (0, student_disciplinary_service_1.listStudentDisciplinaryRecords)(Number(req.params.id), {
        academicYear: typeof req.query.academicYear === "string" ? req.query.academicYear : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
        incidentType: typeof req.query.incidentType === "string" ? req.query.incidentType : undefined,
        page: Number(req.query.page),
        pageSize: Number(req.query.pageSize),
    });
    if (!result)
        return res.status(404).json({ ok: false, message: "Student not found." });
    return res.json({ ok: true, ...result });
}
async function createDisciplinary(req, res) {
    const result = await (0, student_disciplinary_service_1.createStudentDisciplinaryRecord)(Number(req.params.id), req.body ?? {}, context(req));
    if (!result.ok)
        return res.status(result.code).json(result);
    return res.status(201).json(result);
}
async function updateDisciplinary(req, res) {
    const result = await (0, student_disciplinary_service_1.updateStudentDisciplinaryRecord)(Number(req.params.id), Number(req.params.recordId), req.body ?? {}, context(req));
    if (!result.ok)
        return res.status(result.code).json(result);
    return res.json(result);
}
