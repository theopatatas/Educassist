"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyQuizzes = listMyQuizzes;
exports.createMyQuiz = createMyQuiz;
exports.updateMyQuiz = updateMyQuiz;
exports.startMyQuiz = startMyQuiz;
exports.submitMyQuiz = submitMyQuiz;
exports.listMyQuizResults = listMyQuizResults;
const quizzes_service_1 = require("./quizzes.service");
async function listMyQuizzes(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const quizzes = role === "student" ? await (0, quizzes_service_1.listQuizzesForStudent)(userId) : await (0, quizzes_service_1.listQuizzesForTeacher)(userId);
    if (!quizzes) {
        return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
    }
    return res.json({ ok: true, quizzes });
}
async function createMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const quiz = await (0, quizzes_service_1.createQuizForTeacher)(userId, req.body ?? {});
    if (quiz === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (quiz === false)
        return res.status(400).json({ ok: false, message: "Invalid class or payload" });
    return res.status(201).json({ ok: true, quiz });
}
async function updateMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const quiz = await (0, quizzes_service_1.updateQuizForTeacher)(userId, req.params.id, req.body ?? {});
    if (quiz === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (quiz === false)
        return res.status(404).json({ ok: false, message: "Quiz not found" });
    return res.json({ ok: true, quiz });
}
async function startMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, quizzes_service_1.startQuizForStudent)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    if (result === false)
        return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
    return res.json({ ok: true, attempt: result });
}
async function submitMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const score = Number(req.body?.score ?? 0);
    const result = await (0, quizzes_service_1.submitQuizForStudent)(userId, req.params.id, score);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    if (result === false)
        return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
    return res.json({ ok: true, attempt: result });
}
async function listMyQuizResults(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, quizzes_service_1.listQuizResultsForTeacher)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Quiz not found" });
    return res.json({ ok: true, results: result });
}
