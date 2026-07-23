"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyExams = listMyExams;
exports.createMyExam = createMyExam;
exports.updateMyExam = updateMyExam;
exports.deleteMyExam = deleteMyExam;
const exams_service_1 = require("./exams.service");
function parseCoverage(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
                return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
        catch {
            return value
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }
    return [];
}
function normalizeExamPayload(req) {
    const body = req.body ?? {};
    return {
        ...body,
        classId: body.classId ? Number(body.classId) : undefined,
        coverage: parseCoverage(body.coverage),
    };
}
async function listMyExams(req, res) {
    const user = req.user;
    const userId = user?.sub;
    const role = user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exams = role === "student"
        ? await (0, exams_service_1.listExamsForStudent)(userId)
        : await (0, exams_service_1.listExamsForTeacher)(userId, {
            section: req.query.section,
            gradeLevel: req.query.gradeLevel,
        });
    if (exams === null) {
        return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
    }
    return res.json({ ok: true, exams });
}
async function createMyExam(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exam = await (0, exams_service_1.createExamForTeacher)(userId, normalizeExamPayload(req));
    if (exam === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (exam === "past_date")
        return res.status(400).json({ ok: false, message: "You cannot schedule an exam in the past." });
    if (exam === false)
        return res.status(400).json({ ok: false, message: "Invalid class or payload" });
    return res.status(201).json({ ok: true, exam });
}
async function updateMyExam(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exam = await (0, exams_service_1.updateExamForTeacher)(userId, req.params.id, normalizeExamPayload(req));
    if (exam === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (exam === "past_date")
        return res.status(400).json({ ok: false, message: "You cannot schedule an exam in the past." });
    if (exam === false)
        return res.status(404).json({ ok: false, message: "Exam not found" });
    return res.json({ ok: true, exam });
}
async function deleteMyExam(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const deleted = await (0, exams_service_1.deleteExamForTeacher)(userId, req.params.id);
    if (deleted === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (deleted === false)
        return res.status(404).json({ ok: false, message: "Exam not found" });
    return res.json({ ok: true, message: "Exam schedule marked as done and deleted successfully." });
}
