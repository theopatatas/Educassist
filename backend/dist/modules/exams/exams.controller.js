"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyExams = listMyExams;
exports.createMyExam = createMyExam;
exports.updateMyExam = updateMyExam;
const exams_service_1 = require("./exams.service");
async function listMyExams(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exams = role === "student" ? await (0, exams_service_1.listExamsForStudent)(userId) : await (0, exams_service_1.listExamsForTeacher)(userId);
    if (exams === null) {
        return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
    }
    return res.json({ ok: true, exams });
}
async function createMyExam(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exam = await (0, exams_service_1.createExamForTeacher)(userId, req.body ?? {});
    if (exam === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (exam === false)
        return res.status(400).json({ ok: false, message: "Invalid class or payload" });
    return res.status(201).json({ ok: true, exam });
}
async function updateMyExam(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const exam = await (0, exams_service_1.updateExamForTeacher)(userId, req.params.id, req.body ?? {});
    if (exam === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (exam === false)
        return res.status(404).json({ ok: false, message: "Exam not found" });
    return res.json({ ok: true, exam });
}
