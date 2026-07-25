"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = generateQuiz;
exports.regenerateQuestion = regenerateQuestion;
exports.generateLesson = generateLesson;
exports.regenerateSection = regenerateSection;
exports.getLessonPlans = getLessonPlans;
exports.createLessonPlan = createLessonPlan;
exports.updateLessonPlan = updateLessonPlan;
exports.exportLessonPdf = exportLessonPdf;
exports.exportLessonDocx = exportLessonDocx;
const teacher_assistant_service_1 = require("./teacher-assistant.service");
const userId = (req) => String(req.user?.sub ?? "");
function missingText(body, fields) {
    return fields.some((field) => !String(body[field] ?? "").trim());
}
function generationError(res, error) {
    const message = error instanceof Error && error.message === "AI_GENERATION_UNAVAILABLE"
        ? "AI content generation is unavailable. Configure the AI provider and try again."
        : "AI could not generate valid educational content. Please try again.";
    return res.status(503).json({ ok: false, message });
}
async function generateQuiz(req, res) {
    if (missingText(req.body ?? {}, [
        "subject",
        "gradeLevel",
        "topic",
        "objectives",
    ]) ||
        !Array.isArray(req.body?.questionTypes) ||
        req.body.questionTypes.length === 0) {
        return res.status(400).json({
            ok: false,
            message: "Subject, grade level, topic, objectives, and question types are required.",
        });
    }
    try {
        return res.json({ ok: true, draft: await (0, teacher_assistant_service_1.generateQuizDraft)(req.body ?? {}) });
    }
    catch (error) {
        return generationError(res, error);
    }
}
async function regenerateQuestion(req, res) {
    try {
        return res.json({
            ok: true,
            question: await (0, teacher_assistant_service_1.regenerateQuizQuestion)(req.body ?? {}),
        });
    }
    catch (error) {
        return generationError(res, error);
    }
}
async function generateLesson(req, res) {
    if (missingText(req.body ?? {}, [
        "subject",
        "gradeLevel",
        "topic",
        "objectives",
    ])) {
        return res.status(400).json({
            ok: false,
            message: "Subject, grade level, topic, and objectives are required.",
        });
    }
    try {
        return res.json({
            ok: true,
            draft: await (0, teacher_assistant_service_1.generateLessonDraft)(req.body ?? {}),
        });
    }
    catch (error) {
        return generationError(res, error);
    }
}
async function regenerateSection(req, res) {
    try {
        return res.json({
            ok: true,
            section: await (0, teacher_assistant_service_1.regenerateLessonSection)(req.body ?? {}),
        });
    }
    catch (error) {
        return generationError(res, error);
    }
}
async function getLessonPlans(req, res) {
    const plans = await (0, teacher_assistant_service_1.listLessonPlans)(userId(req));
    if (!plans)
        return res.status(404).json({ ok: false, message: "Teacher not found" });
    return res.json({ ok: true, plans });
}
async function createLessonPlan(req, res) {
    const plan = await (0, teacher_assistant_service_1.saveLessonPlan)(userId(req), req.body ?? {});
    if (!plan)
        return res.status(400).json({ ok: false, message: "Invalid lesson plan" });
    return res.status(201).json({ ok: true, plan });
}
async function updateLessonPlan(req, res) {
    const plan = await (0, teacher_assistant_service_1.saveLessonPlan)(userId(req), req.body ?? {}, req.params.id);
    if (!plan)
        return res.status(404).json({ ok: false, message: "Lesson plan not found" });
    return res.json({ ok: true, plan });
}
async function exportLessonPdf(req, res) {
    const file = await (0, teacher_assistant_service_1.lessonPlanPdf)(userId(req), req.params.id);
    if (!file)
        return res.status(404).json({ ok: false, message: "Lesson plan not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="lesson-plan.pdf"`);
    return res.send(file);
}
async function exportLessonDocx(req, res) {
    const file = await (0, teacher_assistant_service_1.lessonPlanDocx)(userId(req), req.params.id);
    if (!file)
        return res.status(404).json({ ok: false, message: "Lesson plan not found" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="lesson-plan.docx"`);
    return res.send(file);
}
