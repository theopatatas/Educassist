"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyQuizzes = listMyQuizzes;
exports.createMyQuiz = createMyQuiz;
exports.getMyQuiz = getMyQuiz;
exports.updateMyQuiz = updateMyQuiz;
exports.saveMyQuizQuestions = saveMyQuizQuestions;
exports.startMyQuiz = startMyQuiz;
exports.submitMyQuiz = submitMyQuiz;
exports.leaveMyQuiz = leaveMyQuiz;
exports.listMyQuizResults = listMyQuizResults;
exports.getMyQuizAnalytics = getMyQuizAnalytics;
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
    if (quiz === "past_date")
        return res.status(400).json({ ok: false, message: "You cannot create a quiz with a past date." });
    if (quiz === false)
        return res.status(400).json({ ok: false, message: "Invalid class or payload" });
    return res.status(201).json({ ok: true, quiz });
}
async function getMyQuiz(req, res) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = role === "student" ? await (0, quizzes_service_1.getQuizDetailForStudent)(userId, req.params.id) : await (0, quizzes_service_1.getQuizDetailForTeacher)(userId, req.params.id);
    if (result === null) {
        return res.status(404).json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
    }
    if (result === "closed") {
        return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
    }
    if (result === false) {
        return res.status(404).json({ ok: false, message: "Quiz not found" });
    }
    return res.json({ ok: true, quiz: result });
}
async function updateMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const quiz = await (0, quizzes_service_1.updateQuizForTeacher)(userId, req.params.id, req.body ?? {});
    if (quiz === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (quiz === "past_date")
        return res.status(400).json({ ok: false, message: "You cannot create a quiz with a past date." });
    if (quiz === false)
        return res.status(404).json({ ok: false, message: "Quiz not found" });
    return res.json({ ok: true, quiz });
}
async function saveMyQuizQuestions(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const quiz = await (0, quizzes_service_1.saveQuizQuestionsForTeacher)(userId, req.params.id, req.body?.questions ?? []);
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
    if (result === "closed") {
        return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
    }
    if (result === false)
        return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
    return res.json({ ok: true, attempt: result });
}
async function submitMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, quizzes_service_1.submitQuizForStudent)(userId, req.params.id, req.body?.answers ?? []);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    if (result === "closed") {
        return res.status(403).json({ ok: false, message: "This quiz is already closed because the teacher has published the results." });
    }
    if (result === false)
        return res.status(403).json({ ok: false, message: "Not enrolled in this class quiz" });
    return res.json({ ok: true, ...result });
}
async function leaveMyQuiz(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, quizzes_service_1.leaveQuizForStudent)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    if (result === false)
        return res.status(400).json({ ok: false, message: "Quiz is not in an active attempt." });
    return res.json({ ok: true, ...result });
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
async function getMyQuizAnalytics(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, quizzes_service_1.getQuizAnalyticsForTeacher)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Quiz not found" });
    return res.json({ ok: true, analytics: result });
}
