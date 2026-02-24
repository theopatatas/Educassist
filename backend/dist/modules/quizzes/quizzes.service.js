"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listQuizzesForTeacher = listQuizzesForTeacher;
exports.listQuizzesForStudent = listQuizzesForStudent;
exports.createQuizForTeacher = createQuizForTeacher;
exports.updateQuizForTeacher = updateQuizForTeacher;
exports.startQuizForStudent = startQuizForStudent;
exports.submitQuizForStudent = submitQuizForStudent;
exports.listQuizResultsForTeacher = listQuizResultsForTeacher;
const Class_model_1 = require("../../db/models/Class.model");
const Quiz_model_1 = require("../../db/models/Quiz.model");
const QuizAttempt_model_1 = require("../../db/models/QuizAttempt.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}
function enrollmentKey(sectionId, yearLevel) {
    return `${Number(sectionId ?? 0)}|${normalizeText(yearLevel)}`;
}
function parseSettings(settingsJson) {
    let parsed = {};
    if (typeof settingsJson === "string") {
        try {
            parsed = JSON.parse(settingsJson);
        }
        catch {
            parsed = {};
        }
    }
    else {
        parsed = (settingsJson ?? {});
    }
    return {
        dueDate: parsed?.dueDate ?? null,
        questions: Number(parsed?.questions ?? 0),
    };
}
function colorForSubject(subjectName) {
    const s = (subjectName ?? "").toLowerCase();
    if (s.includes("science"))
        return "green";
    if (s.includes("math"))
        return "blue";
    if (s.includes("english"))
        return "purple";
    if (s.includes("filipino"))
        return "orange";
    return "blue";
}
async function listQuizzesForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [quizzes, subjects, sections, students] = await Promise.all([
        Quiz_model_1.Quiz.findAll({ where: { classId: classIds }, order: [["createdAt", "DESC"]] }),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        Student_model_1.Student.findAll({ attributes: ["id", "sectionId", "yearLevel"] }),
    ]);
    const quizIds = quizzes.map((q) => Number(q.id));
    const attemptRows = quizIds.length > 0 ? await QuizAttempt_model_1.QuizAttempt.findAll({ where: { quizId: quizIds } }) : [];
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const studentCountMap = new Map();
    const enrolledByKey = new Map();
    for (const s of students) {
        const key = enrollmentKey(s.sectionId, s.yearLevel);
        studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1);
        const set = enrolledByKey.get(key) ?? new Set();
        set.add(Number(s.id));
        enrolledByKey.set(key, set);
    }
    return quizzes.map((q) => {
        const cls = q.classId ? classMap.get(Number(q.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const settings = parseSettings(q.settingsJson);
        const enrollKey = cls ? enrollmentKey(cls.sectionId, cls.gradeLevel) : "";
        const enrolledIds = enrolledByKey.get(enrollKey) ?? new Set();
        const quizAttempts = attemptRows.filter((a) => Number(a.quizId) === Number(q.id) && enrolledIds.has(Number(a.studentId)));
        const completed = quizAttempts.filter((a) => !!a.completedAt).length;
        const total = cls ? studentCountMap.get(enrollKey) ?? 0 : 0;
        const avgScore = completed
            ? Math.round(quizAttempts
                .filter((a) => !!a.completedAt)
                .reduce((sum, a) => sum + Number(a.score ?? 0), 0) / completed)
            : 0;
        return {
            ...q.toJSON(),
            subjectName,
            sectionName,
            color: colorForSubject(subjectName),
            dueDate: settings.dueDate,
            questions: settings.questions,
            completed,
            total,
            avgScore,
        };
    });
}
async function listQuizzesForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    if (!student.sectionId || !student.yearLevel)
        return [];
    const classesBySection = await Class_model_1.Class.findAll({
        where: {
            sectionId: student.sectionId,
        },
    });
    const classes = classesBySection.filter((c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel));
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [quizzes, subjects, sections, attempts] = await Promise.all([
        Quiz_model_1.Quiz.findAll({ where: { classId: classIds }, order: [["createdAt", "DESC"]] }),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        QuizAttempt_model_1.QuizAttempt.findAll({ where: { studentId: student.id } }),
    ]);
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const attemptMap = new Map();
    for (const a of attempts) {
        const quizId = Number(a.quizId);
        const existing = attemptMap.get(quizId);
        if (!existing || (a.updatedAt && existing.updatedAt && a.updatedAt > existing.updatedAt)) {
            attemptMap.set(quizId, a);
        }
    }
    return quizzes.map((q) => {
        const cls = q.classId ? classMap.get(Number(q.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const settings = parseSettings(q.settingsJson);
        const attempt = attemptMap.get(Number(q.id));
        const myAttempt = attempt?.completedAt ? "Submitted" : attempt?.startedAt ? "In Progress" : "Not Started";
        const myScore = Number(attempt?.score ?? 0);
        return {
            ...q.toJSON(),
            subjectName,
            sectionName,
            color: colorForSubject(subjectName),
            dueDate: settings.dueDate,
            questions: settings.questions,
            myAttempt,
            myScore,
        };
    });
}
async function createQuizForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    if (!input.classId || !input.title?.trim())
        return false;
    const cls = await Class_model_1.Class.findByPk(input.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const quiz = await Quiz_model_1.Quiz.create({
        classId: cls.id,
        title: input.title.trim().slice(0, 160),
        timeLimit: input.timeLimitMinutes ?? null,
        attemptLimit: 1,
        settingsJson: {
            dueDate: input.dueDate ?? null,
            questions: Number(input.questions ?? 0),
        },
    });
    return quiz;
}
async function updateQuizForTeacher(userId, quizId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz)
        return false;
    const oldClass = quiz.classId ? await Class_model_1.Class.findByPk(quiz.classId) : null;
    if (!oldClass || oldClass.teacherId !== teacher.id)
        return false;
    let classId = quiz.classId;
    if (input.classId && input.classId !== quiz.classId) {
        const nextClass = await Class_model_1.Class.findByPk(input.classId);
        if (!nextClass || nextClass.teacherId !== teacher.id)
            return false;
        classId = nextClass.id;
    }
    const previousSettings = parseSettings(quiz.settingsJson);
    const nextTitle = input.title?.trim() ? input.title.trim().slice(0, 160) : quiz.title;
    await quiz.update({
        classId,
        title: nextTitle,
        timeLimit: input.timeLimitMinutes ?? quiz.timeLimit,
        settingsJson: {
            dueDate: input.dueDate ?? previousSettings.dueDate,
            questions: Number(input.questions ?? previousSettings.questions ?? 0),
        },
    });
    return quiz;
}
async function startQuizForStudent(userId, quizId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz || !quiz.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(quiz.classId);
    if (!cls || !student.sectionId || !student.yearLevel || !cls.sectionId || !cls.gradeLevel)
        return false;
    const sectionOk = Number(student.sectionId) === Number(cls.sectionId);
    const levelOk = normalizeText(student.yearLevel) === normalizeText(cls.gradeLevel);
    if (!sectionOk || !levelOk)
        return false;
    const existing = await QuizAttempt_model_1.QuizAttempt.findOne({ where: { quizId: quiz.id, studentId: student.id } });
    if (existing) {
        if (!existing.startedAt) {
            await existing.update({ startedAt: new Date() });
        }
        return existing;
    }
    return QuizAttempt_model_1.QuizAttempt.create({
        quizId: Number(quiz.id),
        studentId: Number(student.id),
        startedAt: new Date(),
        completedAt: null,
        score: 0,
    });
}
async function submitQuizForStudent(userId, quizId, score) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz || !quiz.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(quiz.classId);
    if (!cls || !student.sectionId || !student.yearLevel || !cls.sectionId || !cls.gradeLevel)
        return false;
    const sectionOk = Number(student.sectionId) === Number(cls.sectionId);
    const levelOk = normalizeText(student.yearLevel) === normalizeText(cls.gradeLevel);
    if (!sectionOk || !levelOk)
        return false;
    const safeScore = Math.max(0, Math.min(100, Number(score ?? 0)));
    const existing = await QuizAttempt_model_1.QuizAttempt.findOne({ where: { quizId: quiz.id, studentId: student.id } });
    if (existing) {
        await existing.update({
            startedAt: existing.startedAt ?? new Date(),
            completedAt: new Date(),
            score: safeScore,
        });
        return existing;
    }
    return QuizAttempt_model_1.QuizAttempt.create({
        quizId: Number(quiz.id),
        studentId: Number(student.id),
        startedAt: new Date(),
        completedAt: new Date(),
        score: safeScore,
    });
}
async function listQuizResultsForTeacher(userId, quizId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz || !quiz.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(quiz.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const studentsInSection = await Student_model_1.Student.findAll({
        where: { sectionId: cls.sectionId },
        attributes: ["id", "firstName", "lastName", "sectionId", "yearLevel"],
    });
    const enrolledStudents = studentsInSection.filter((s) => normalizeText(s.yearLevel) === normalizeText(cls.gradeLevel));
    const enrolledIds = new Set(enrolledStudents.map((s) => Number(s.id)));
    const attempts = await QuizAttempt_model_1.QuizAttempt.findAll({
        where: { quizId: quiz.id },
        order: [["updatedAt", "DESC"]],
    });
    const filteredAttempts = attempts.filter((a) => enrolledIds.has(Number(a.studentId)));
    const studentIds = filteredAttempts.map((a) => Number(a.studentId));
    const students = studentIds.length ? await Student_model_1.Student.findAll({ where: { id: studentIds } }) : [];
    const studentMap = new Map(students.map((s) => [Number(s.id), s]));
    const results = filteredAttempts.map((a) => {
        const s = studentMap.get(Number(a.studentId));
        const started = a.startedAt ? new Date(a.startedAt).getTime() : null;
        const ended = a.completedAt ? new Date(a.completedAt).getTime() : null;
        const minutes = started && ended && ended > started
            ? Math.max(1, Math.round((ended - started) / (1000 * 60)))
            : null;
        return {
            id: Number(a.id),
            studentId: Number(a.studentId),
            studentName: s ? `${s.lastName}, ${s.firstName}` : `Student #${a.studentId}`,
            status: a.completedAt ? "Submitted" : a.startedAt ? "In Progress" : "Not Started",
            score: Number(a.score ?? 0),
            timeTaken: minutes ? `${minutes} mins` : "-",
        };
    });
    return results;
}
