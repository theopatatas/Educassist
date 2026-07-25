"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuizDraft = generateQuizDraft;
exports.regenerateQuizQuestion = regenerateQuizQuestion;
exports.generateLessonDraft = generateLessonDraft;
exports.regenerateLessonSection = regenerateLessonSection;
exports.listLessonPlans = listLessonPlans;
exports.saveLessonPlan = saveLessonPlan;
exports.getLessonPlan = getLessonPlan;
exports.lessonPlanPdf = lessonPlanPdf;
exports.lessonPlanDocx = lessonPlanDocx;
const docx_1 = require("docx");
const pdfkit_1 = __importDefault(require("pdfkit"));
const LessonPlan_model_1 = require("../../db/models/LessonPlan.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const ai_service_1 = require("../ai/ai.service");
function extractJson(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    return JSON.parse((fenced ?? text).trim());
}
async function requireExternalTeacherAI(prompt) {
    const result = await (0, ai_service_1.generateAIResponse)({ role: "teacher", prompt });
    if (!result.ok)
        throw new Error(result.reason);
    if (result.provider !== "openai") {
        throw new Error("AI_GENERATION_UNAVAILABLE");
    }
    return extractJson(result.text);
}
function cleanQuestion(value) {
    const row = (value ?? {});
    const allowed = new Set([
        "multiple_choice",
        "true_false",
        "identification",
        "short_answer",
        "essay",
    ]);
    const type = allowed.has(String(row.type))
        ? String(row.type)
        : "multiple_choice";
    return {
        type,
        text: String(row.text ?? "").trim(),
        options: Array.isArray(row.options)
            ? row.options.map(String).map((item) => item.trim()).filter(Boolean)
            : [],
        correctAnswer: type === "true_false"
            ? Boolean(row.correctAnswer)
            : String(row.correctAnswer ?? "").trim(),
        explanation: String(row.explanation ?? "").trim(),
        points: Math.max(1, Math.round(Number(row.points) || 1)),
    };
}
async function generateQuizDraft(input) {
    const numberOfQuestions = Math.min(50, Math.max(1, Math.round(Number(input.numberOfQuestions) || 10)));
    const prompt = [
        "Create a teacher-reviewed quiz draft. Return JSON only.",
        `Subject: ${String(input.subject ?? "")}`,
        `Grade level: ${String(input.gradeLevel ?? "")}`,
        `Topic: ${String(input.topic ?? "")}`,
        `Learning competencies: ${String(input.competencies ?? "")}`,
        `Learning objectives: ${String(input.objectives ?? "")}`,
        `Difficulty: ${String(input.difficulty ?? "Medium")}`,
        `Question count: ${numberOfQuestions}`,
        `Allowed question types: ${Array.isArray(input.questionTypes) ? input.questionTypes.join(", ") : ""}`,
        'Schema: {"title":"","description":"","questions":[{"type":"multiple_choice|true_false|identification|short_answer|essay","text":"","options":[],"correctAnswer":"","explanation":"","points":1}]}',
        "Multiple-choice items must have four plausible choices. Identification must have a concise exact answer. Essay items need a suggested answer key. Do not include markdown.",
    ].join("\n");
    const parsed = (await requireExternalTeacherAI(prompt));
    const questions = Array.isArray(parsed.questions)
        ? parsed.questions.map(cleanQuestion).filter((item) => item.text)
        : [];
    if (!questions.length)
        throw new Error("INVALID_AI_RESPONSE");
    return {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        questions,
    };
}
async function regenerateQuizQuestion(input) {
    const prompt = [
        "Regenerate one quiz question and return JSON only.",
        `Subject: ${String(input.subject ?? "")}`,
        `Grade level: ${String(input.gradeLevel ?? "")}`,
        `Topic: ${String(input.topic ?? "")}`,
        `Difficulty: ${String(input.difficulty ?? "Medium")}`,
        `Question type: ${String(input.type ?? "multiple_choice")}`,
        `Existing question to replace: ${String(input.currentText ?? "")}`,
        'Schema: {"type":"","text":"","options":[],"correctAnswer":"","explanation":"","points":1}',
        "Do not include markdown.",
    ].join("\n");
    return cleanQuestion(await requireExternalTeacherAI(prompt));
}
async function generateLessonDraft(input) {
    const prompt = [
        "Create an editable Philippine Department of Education (DepEd) Daily Lesson Plan draft for teacher review. Return JSON only.",
        "Follow the current DepEd K to 12 or MATATAG-aligned Daily Lesson Plan structure appropriate to the supplied grade level and subject.",
        `Subject: ${String(input.subject ?? "")}`,
        `Grade level: ${String(input.gradeLevel ?? "")}`,
        `Topic: ${String(input.topic ?? "")}`,
        `Learning competencies: ${String(input.competencies ?? "")}`,
        `Learning objectives: ${String(input.objectives ?? "")}`,
        `Teaching time: ${String(input.duration ?? "")}`,
        `Teaching strategy: ${String(input.strategy ?? "")}`,
        'Schema: {"title":"","sections":[{"heading":"Objectives","content":""}]}',
        "Return these sections in order:",
        "I. Objectives — include Content Standard, Performance Standard, and Learning Competencies/Objectives.",
        "II. Content — state the lesson content or topic.",
        "III. Learning Resources — include References and Other Learning Resources.",
        "IV. Procedures — include reviewing the previous lesson, establishing the lesson purpose, presenting examples, discussing concepts and guided practice, developing mastery with formative assessment, practical application, generalization, evaluating learning, and additional activities for enrichment or remediation.",
        "V. Remarks.",
        "VI. Reflection — include learner mastery, remediation, teaching difficulties, and effective strategies or innovations for the teacher to complete after teaching.",
        "Keep activities age-appropriate, inclusive, contextualized for Philippine learners, achievable within the supplied teaching time, and aligned with the supplied competencies and objectives.",
        "Use the supplied teaching strategy where appropriate and include suitable assessment and differentiation.",
        'Never invent an official DepEd competency code, curriculum code, textbook page, module number, policy reference, or source. Write "To be supplied by the teacher" when this information was not provided.',
        "Do not include markdown.",
    ].join("\n");
    const parsed = (await requireExternalTeacherAI(prompt));
    const sections = Array.isArray(parsed.sections)
        ? parsed.sections
            .map((value) => {
            const row = value;
            return {
                heading: String(row.heading ?? "").trim(),
                content: String(row.content ?? "").trim(),
            };
        })
            .filter((section) => section.heading)
        : [];
    if (!sections.length)
        throw new Error("INVALID_AI_RESPONSE");
    return { title: String(parsed.title ?? "").trim(), sections };
}
async function regenerateLessonSection(input) {
    const prompt = [
        "Regenerate one section of a Philippine DepEd-aligned Daily Lesson Plan and return JSON only.",
        `Subject: ${String(input.subject ?? "")}`,
        `Grade level: ${String(input.gradeLevel ?? "")}`,
        `Topic: ${String(input.topic ?? "")}`,
        `Section heading: ${String(input.heading ?? "")}`,
        `Current content: ${String(input.content ?? "")}`,
        'Schema: {"heading":"","content":""}',
        "Keep the section aligned with DepEd Daily Lesson Plan conventions, appropriate to Philippine learners, and consistent with the supplied subject, grade level, and topic.",
        'Never invent an official DepEd competency code, curriculum code, textbook page, module number, policy reference, or source. Write "To be supplied by the teacher" when necessary.',
        "Do not include markdown.",
    ].join("\n");
    const parsed = (await requireExternalTeacherAI(prompt));
    return {
        heading: String(parsed.heading ?? input.heading ?? "").trim(),
        content: String(parsed.content ?? "").trim(),
    };
}
async function teacherForUser(userId) {
    return Teacher_model_1.Teacher.findOne({ where: { userId } });
}
async function listLessonPlans(userId) {
    const teacher = await teacherForUser(userId);
    if (!teacher)
        return null;
    return LessonPlan_model_1.LessonPlan.findAll({
        where: { teacherId: teacher.id },
        order: [["updatedAt", "DESC"]],
    });
}
async function saveLessonPlan(userId, input, id) {
    const teacher = await teacherForUser(userId);
    if (!teacher)
        return null;
    const sections = Array.isArray(input.sections) ? input.sections : [];
    const payload = {
        title: String(input.title ?? "").trim().slice(0, 200),
        subject: String(input.subject ?? "").trim().slice(0, 160),
        gradeLevel: String(input.gradeLevel ?? "").trim().slice(0, 60),
        topic: String(input.topic ?? "").trim().slice(0, 240),
        contentJson: sections,
        status: input.status === "final" ? "final" : "draft",
    };
    if (!payload.title || !payload.subject || !payload.gradeLevel || !payload.topic)
        return false;
    if (id) {
        const plan = await LessonPlan_model_1.LessonPlan.findOne({
            where: { id, teacherId: teacher.id },
        });
        if (!plan)
            return false;
        await plan.update(payload);
        return plan;
    }
    return LessonPlan_model_1.LessonPlan.create({ ...payload, teacherId: teacher.id });
}
async function getLessonPlan(userId, id) {
    const teacher = await teacherForUser(userId);
    if (!teacher)
        return null;
    return LessonPlan_model_1.LessonPlan.findOne({ where: { id, teacherId: teacher.id } });
}
function planSections(plan) {
    let value = plan.contentJson;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        }
        catch {
            value = [];
        }
    }
    return Array.isArray(value) ? value : [];
}
function plainText(value) {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();
}
async function lessonPlanPdf(userId, id) {
    const plan = await getLessonPlan(userId, id);
    if (!plan)
        return null;
    const document = new pdfkit_1.default({ margin: 54 });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
    document.fontSize(20).text(plan.title, { align: "center" });
    document.moveDown().fontSize(10).fillColor("#475569");
    document.text(`${plan.subject} • ${plan.gradeLevel} • ${plan.topic}`, {
        align: "center",
    });
    document.fillColor("#0f172a");
    for (const section of planSections(plan)) {
        document.moveDown().fontSize(14).text(section.heading);
        document.moveDown(0.35).fontSize(11).text(plainText(section.content));
    }
    document.end();
    return finished;
}
async function lessonPlanDocx(userId, id) {
    const plan = await getLessonPlan(userId, id);
    if (!plan)
        return null;
    const children = [
        new docx_1.Paragraph({
            heading: docx_1.HeadingLevel.TITLE,
            alignment: "center",
            children: [new docx_1.TextRun(plan.title)],
        }),
        new docx_1.Paragraph({
            alignment: "center",
            children: [
                new docx_1.TextRun(`${plan.subject} • ${plan.gradeLevel} • ${plan.topic}`),
            ],
        }),
        ...planSections(plan).flatMap((section) => [
            new docx_1.Paragraph({
                heading: docx_1.HeadingLevel.HEADING_1,
                children: [new docx_1.TextRun(section.heading)],
            }),
            new docx_1.Paragraph({ children: [new docx_1.TextRun(plainText(section.content))] }),
        ]),
    ];
    return docx_1.Packer.toBuffer(new docx_1.Document({ sections: [{ children }] }));
}
