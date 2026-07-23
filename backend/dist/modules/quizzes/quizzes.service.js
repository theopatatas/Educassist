"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listQuizzesForTeacher = listQuizzesForTeacher;
exports.listQuizzesForStudent = listQuizzesForStudent;
exports.createQuizForTeacher = createQuizForTeacher;
exports.updateQuizForTeacher = updateQuizForTeacher;
exports.getQuizDetailForTeacher = getQuizDetailForTeacher;
exports.getQuizDetailForStudent = getQuizDetailForStudent;
exports.saveQuizQuestionsForTeacher = saveQuizQuestionsForTeacher;
exports.startQuizForStudent = startQuizForStudent;
exports.submitQuizForStudent = submitQuizForStudent;
exports.leaveQuizForStudent = leaveQuizForStudent;
exports.listQuizResultsForTeacher = listQuizResultsForTeacher;
exports.getQuizAnalyticsForTeacher = getQuizAnalyticsForTeacher;
const Class_model_1 = require("../../db/models/Class.model");
const QuestionBank_model_1 = require("../../db/models/QuestionBank.model");
const Quiz_model_1 = require("../../db/models/Quiz.model");
const QuizAttempt_model_1 = require("../../db/models/QuizAttempt.model");
const QuizAttemptAnswer_model_1 = require("../../db/models/QuizAttemptAnswer.model");
const calculations_1 = require("../../utils/calculations");
const QuizQuestion_model_1 = require("../../db/models/QuizQuestion.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const QUIZ_LEAVE_PENALTY_POINTS = 1;
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
    else if (settingsJson && typeof settingsJson === "object") {
        parsed = settingsJson;
    }
    return {
        dueDate: parsed?.dueDate ?? null,
        questions: Number(parsed?.questions ?? 0),
        publishResults: Boolean(parsed?.publishResults ?? false),
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
function isPastQuizDate(dueDate) {
    if (!dueDate)
        return false;
    const selected = new Date(dueDate);
    if (Number.isNaN(selected.getTime()))
        return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() < today.getTime();
}
function safePoints(value) {
    const points = Number(value ?? 1);
    return Number.isFinite(points) ? Math.max(1, Math.round(points)) : 1;
}
function parseOptions(value) {
    let parsed = value;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            parsed = [];
        }
    }
    if (!Array.isArray(parsed))
        return [];
    return parsed.map((option) => String(option ?? "").trim()).filter(Boolean);
}
function parseStoredCorrectAnswer(value) {
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function serializeCorrectAnswer(value, type) {
    if (type === "checkbox") {
        const items = Array.isArray(value)
            ? value
                .map((item) => String(item ?? "").trim())
                .filter(Boolean)
                .sort()
            : [];
        return JSON.stringify(items);
    }
    if (type === "true_false") {
        const boolValue = typeof value === "boolean"
            ? value
            : normalizeText(value) === "true" ||
                normalizeText(value) === "t" ||
                normalizeText(value) === "1";
        return JSON.stringify(boolValue);
    }
    return JSON.stringify(String(value ?? "").trim());
}
function normalizeAnswerForCompare(value, type) {
    if (type === "checkbox") {
        const items = Array.isArray(value) ? value : [];
        return items
            .map((item) => normalizeText(item))
            .filter(Boolean)
            .sort();
    }
    if (type === "true_false") {
        if (typeof value === "boolean")
            return value;
        const normalized = normalizeText(value);
        return normalized === "true" || normalized === "1" || normalized === "t";
    }
    return normalizeText(value);
}
function answersMatch(question, studentAnswer) {
    if (question.type === "short_answer") {
        return null;
    }
    const expected = normalizeAnswerForCompare(question.correctAnswer, question.type);
    const actual = normalizeAnswerForCompare(studentAnswer, question.type);
    if (question.type === "checkbox") {
        const expectedList = Array.isArray(expected) ? expected : [];
        const actualList = Array.isArray(actual) ? actual : [];
        return (expectedList.length === actualList.length &&
            expectedList.every((item, index) => item === actualList[index]));
    }
    return expected === actual;
}
function timeTakenLabel(startedAt, completedAt) {
    const started = startedAt ? new Date(startedAt).getTime() : null;
    const ended = completedAt ? new Date(completedAt).getTime() : null;
    if (!started || !ended || ended <= started)
        return "-";
    return `${Math.max(1, Math.round((ended - started) / (1000 * 60)))} mins`;
}
async function getTeacherByUserId(userId) {
    return Teacher_model_1.Teacher.findOne({ where: { userId } });
}
async function getStudentByUserId(userId) {
    return Student_model_1.Student.findOne({ where: { userId } });
}
async function getClassMetadata() {
    const [subjects, sections] = await Promise.all([
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
    ]);
    return {
        subjectMap: new Map(subjects.map((s) => [Number(s.id), s.name])),
        sectionMap: new Map(sections.map((s) => [Number(s.id), s.name])),
    };
}
async function getQuizQuestionsWithBank(quizId) {
    const quizQuestions = await QuizQuestion_model_1.QuizQuestion.findAll({
        where: { quizId },
        order: [
            ["order", "ASC"],
            ["id", "ASC"],
        ],
    });
    const questionIds = quizQuestions.map((row) => Number(row.questionId));
    const bankRows = questionIds.length
        ? await QuestionBank_model_1.QuestionBank.findAll({ where: { id: questionIds } })
        : [];
    const bankMap = new Map(bankRows.map((row) => [Number(row.id), row]));
    return quizQuestions
        .map((row) => {
        const question = bankMap.get(Number(row.questionId));
        if (!question)
            return null;
        return {
            id: Number(question.id),
            type: question.questionType || "multiple_choice",
            text: question.questionText,
            options: parseOptions(question.choicesJson),
            correctAnswer: parseStoredCorrectAnswer(question.correctAnswer),
            points: safePoints(question.points),
        };
    })
        .filter(Boolean);
}
async function ensureTeacherQuizAccess(userId, quizId) {
    const teacher = await getTeacherByUserId(userId);
    if (!teacher)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz || !quiz.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(quiz.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    return { teacher, quiz, cls };
}
async function ensureStudentQuizAccess(userId, quizId) {
    const student = await getStudentByUserId(userId);
    if (!student)
        return null;
    const quiz = await Quiz_model_1.Quiz.findByPk(quizId);
    if (!quiz || !quiz.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(quiz.classId);
    if (!cls ||
        !student.sectionId ||
        !student.yearLevel ||
        !cls.sectionId ||
        !cls.gradeLevel)
        return false;
    const sectionOk = Number(student.sectionId) === Number(cls.sectionId);
    const levelOk = normalizeText(student.yearLevel) === normalizeText(cls.gradeLevel);
    if (!sectionOk || !levelOk)
        return false;
    return { student, quiz, cls };
}
async function getAttemptsForQuizEnrolledStudents(quiz, cls) {
    const students = await Student_model_1.Student.findAll({
        where: { sectionId: cls.sectionId },
        attributes: ["id", "firstName", "lastName", "sectionId", "yearLevel"],
    });
    const enrolledStudents = students.filter((s) => normalizeText(s.yearLevel) === normalizeText(cls.gradeLevel));
    const enrolledIds = new Set(enrolledStudents.map((s) => Number(s.id)));
    const attempts = await QuizAttempt_model_1.QuizAttempt.findAll({
        where: { quizId: quiz.id },
        order: [["updatedAt", "DESC"]],
    });
    return {
        enrolledIds,
        enrolledStudents,
        attempts: attempts.filter((attempt) => enrolledIds.has(Number(attempt.studentId))),
    };
}
function summarizeQuizAttempts(attempts, totalStudents) {
    const completedAttempts = attempts.filter((attempt) => !!attempt.completedAt);
    const completed = completedAttempts.length;
    const avgScore = completed
        ? Math.round(completedAttempts.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) / completedAttempts.length)
        : 0;
    return {
        completed,
        total: totalStudents,
        avgScore,
    };
}
async function listQuizzesForTeacher(userId) {
    const teacher = await getTeacherByUserId(userId);
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [quizzes, metadata, students] = await Promise.all([
        Quiz_model_1.Quiz.findAll({
            where: { classId: classIds },
            order: [["createdAt", "DESC"]],
        }),
        getClassMetadata(),
        Student_model_1.Student.findAll({ attributes: ["id", "sectionId", "yearLevel"] }),
    ]);
    const quizIds = quizzes.map((q) => Number(q.id));
    const attemptRows = quizIds.length > 0
        ? await QuizAttempt_model_1.QuizAttempt.findAll({ where: { quizId: quizIds } })
        : [];
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
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
        const subjectName = cls?.subjectId
            ? (metadata.subjectMap.get(Number(cls.subjectId)) ?? null)
            : null;
        const sectionName = cls?.sectionId
            ? (metadata.sectionMap.get(Number(cls.sectionId)) ?? null)
            : null;
        const settings = parseSettings(q.settingsJson);
        const enrollKey = cls ? enrollmentKey(cls.sectionId, cls.gradeLevel) : "";
        const enrolledIds = enrolledByKey.get(enrollKey) ?? new Set();
        const quizAttempts = attemptRows.filter((a) => Number(a.quizId) === Number(q.id) &&
            enrolledIds.has(Number(a.studentId)));
        const summary = summarizeQuizAttempts(quizAttempts, cls ? (studentCountMap.get(enrollKey) ?? 0) : 0);
        return {
            ...q.toJSON(),
            subjectName,
            sectionName,
            gradeLevel: cls?.gradeLevel ?? null,
            color: colorForSubject(subjectName),
            dueDate: settings.dueDate,
            questions: settings.questions,
            publishResults: settings.publishResults,
            completed: summary.completed,
            total: summary.total,
            avgScore: summary.avgScore,
        };
    });
}
async function listQuizzesForStudent(userId) {
    const student = await getStudentByUserId(userId);
    if (!student)
        return null;
    if (!student.sectionId || !student.yearLevel)
        return [];
    const classesBySection = await Class_model_1.Class.findAll({
        where: { sectionId: student.sectionId },
    });
    const classes = classesBySection.filter((c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel));
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [quizzes, metadata, allAttempts, teachers] = await Promise.all([
        Quiz_model_1.Quiz.findAll({
            where: { classId: classIds },
            order: [["createdAt", "DESC"]],
        }),
        getClassMetadata(),
        QuizAttempt_model_1.QuizAttempt.findAll(),
        Teacher_model_1.Teacher.findAll(),
    ]);
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const teacherMap = new Map(teachers.map((teacher) => [
        Number(teacher.id),
        `${teacher.firstName} ${teacher.lastName}`.trim(),
    ]));
    const attemptMap = new Map();
    const attemptsByQuiz = new Map();
    for (const attempt of allAttempts) {
        const quizId = Number(attempt.quizId);
        const list = attemptsByQuiz.get(quizId) ?? [];
        list.push(attempt);
        attemptsByQuiz.set(quizId, list);
        if (Number(attempt.studentId) !== Number(student.id))
            continue;
        const existing = attemptMap.get(quizId);
        if (!existing || attempt.updatedAt > existing.updatedAt) {
            attemptMap.set(quizId, attempt);
        }
    }
    const latestAttemptIds = Array.from(attemptMap.values()).map((attempt) => Number(attempt.id));
    const attemptAnswers = latestAttemptIds.length
        ? await QuizAttemptAnswer_model_1.QuizAttemptAnswer.findAll({
            where: { attemptId: latestAttemptIds },
        })
        : [];
    const correctCountByAttemptId = new Map();
    for (const row of attemptAnswers) {
        if (!row.isCorrect)
            continue;
        const attemptId = Number(row.attemptId);
        correctCountByAttemptId.set(attemptId, (correctCountByAttemptId.get(attemptId) ?? 0) + 1);
    }
    return quizzes.map((q) => {
        const cls = q.classId ? classMap.get(Number(q.classId)) : null;
        const subjectName = cls?.subjectId
            ? (metadata.subjectMap.get(Number(cls.subjectId)) ?? null)
            : null;
        const sectionName = cls?.sectionId
            ? (metadata.sectionMap.get(Number(cls.sectionId)) ?? null)
            : null;
        const teacherName = cls?.teacherId
            ? (teacherMap.get(Number(cls.teacherId)) ?? null)
            : null;
        const settings = parseSettings(q.settingsJson);
        const attempt = attemptMap.get(Number(q.id));
        const myAttempt = attempt?.completedAt
            ? "Submitted"
            : attempt?.startedAt
                ? "In Progress"
                : "Not Started";
        const myScore = Number(attempt?.score ?? 0);
        const myCorrectAnswers = attempt
            ? Number(correctCountByAttemptId.get(Number(attempt.id)) ?? 0)
            : 0;
        const completedAttempts = (attemptsByQuiz.get(Number(q.id)) ?? []).filter((item) => !!item.completedAt);
        const classAvg = completedAttempts.length
            ? Math.round(completedAttempts.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / completedAttempts.length)
            : 0;
        return {
            ...q.toJSON(),
            subjectName,
            sectionName,
            gradeLevel: cls?.gradeLevel ?? null,
            color: colorForSubject(subjectName),
            dueDate: settings.dueDate,
            questions: settings.questions,
            publishResults: settings.publishResults,
            teacherName,
            myAttempt,
            myScore,
            myCorrectAnswers,
            classAvg,
        };
    });
}
async function createQuizForTeacher(userId, input) {
    const teacher = await getTeacherByUserId(userId);
    if (!teacher)
        return null;
    if (!input.classId || !input.title?.trim())
        return false;
    if (isPastQuizDate(input.dueDate))
        return "past_date";
    const cls = await Class_model_1.Class.findByPk(input.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    return Quiz_model_1.Quiz.create({
        classId: cls.id,
        title: input.title.trim().slice(0, 160),
        timeLimit: input.timeLimitMinutes ?? null,
        attemptLimit: 1,
        settingsJson: {
            dueDate: input.dueDate ?? null,
            questions: Number(input.questions ?? 0),
            publishResults: Boolean(input.publishResults ?? false),
        },
    });
}
async function updateQuizForTeacher(userId, quizId, input) {
    const access = await ensureTeacherQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { quiz, cls } = access;
    const previousSettings = parseSettings(quiz.settingsJson);
    const nextDueDate = input.dueDate !== undefined ? input.dueDate : previousSettings.dueDate;
    if (isPastQuizDate(nextDueDate))
        return "past_date";
    let classId = quiz.classId;
    if (input.classId && input.classId !== quiz.classId) {
        const nextClass = await Class_model_1.Class.findByPk(input.classId);
        if (!nextClass || nextClass.teacherId !== cls.teacherId)
            return false;
        classId = nextClass.id;
    }
    await quiz.update({
        classId,
        title: input.title?.trim() ? input.title.trim().slice(0, 160) : quiz.title,
        timeLimit: input.timeLimitMinutes ?? quiz.timeLimit,
        settingsJson: {
            dueDate: input.dueDate ?? previousSettings.dueDate,
            questions: Number(input.questions ?? previousSettings.questions ?? 0),
            publishResults: Boolean(input.publishResults ?? previousSettings.publishResults ?? false),
        },
    });
    return quiz;
}
async function getQuizDetailForTeacher(userId, quizId) {
    const access = await ensureTeacherQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { quiz, cls } = access;
    const metadata = await getClassMetadata();
    const questions = await getQuizQuestionsWithBank(Number(quiz.id));
    const { attempts, enrolledStudents } = await getAttemptsForQuizEnrolledStudents(quiz, cls);
    const summary = summarizeQuizAttempts(attempts, enrolledStudents.length);
    const settings = parseSettings(quiz.settingsJson);
    return {
        id: Number(quiz.id),
        title: quiz.title,
        classId: Number(quiz.classId),
        dueDate: settings.dueDate,
        timeLimit: quiz.timeLimit,
        questionCount: questions.length,
        className: cls.sectionId
            ? (metadata.sectionMap.get(Number(cls.sectionId)) ?? "Class")
            : "Class",
        subjectName: cls.subjectId
            ? (metadata.subjectMap.get(Number(cls.subjectId)) ?? "Subject")
            : "Subject",
        publishResults: settings.publishResults,
        summary,
        questions,
    };
}
async function getQuizDetailForStudent(userId, quizId) {
    const access = await ensureStudentQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { student, quiz, cls } = access;
    const metadata = await getClassMetadata();
    const questions = await getQuizQuestionsWithBank(Number(quiz.id));
    const settings = parseSettings(quiz.settingsJson);
    const attempt = await QuizAttempt_model_1.QuizAttempt.findOne({
        where: { quizId: quiz.id, studentId: student.id },
        order: [["updatedAt", "DESC"]],
    });
    if (settings.publishResults && !attempt?.completedAt) {
        return "closed";
    }
    const answerRows = attempt
        ? await QuizAttemptAnswer_model_1.QuizAttemptAnswer.findAll({
            where: { attemptId: attempt.id },
            order: [["updatedAt", "DESC"]],
        })
        : [];
    const answerMap = new Map();
    for (const row of answerRows) {
        answerMap.set(Number(row.questionId), row);
    }
    return {
        id: Number(quiz.id),
        title: quiz.title,
        classId: Number(quiz.classId),
        dueDate: settings.dueDate,
        timeLimit: quiz.timeLimit,
        className: cls.sectionId
            ? (metadata.sectionMap.get(Number(cls.sectionId)) ?? "Class")
            : "Class",
        subjectName: cls.subjectId
            ? (metadata.subjectMap.get(Number(cls.subjectId)) ?? "Subject")
            : "Subject",
        publishResults: settings.publishResults,
        myAttempt: attempt?.completedAt
            ? "Submitted"
            : attempt?.startedAt
                ? "In Progress"
                : "Not Started",
        myScore: Number(attempt?.score ?? 0),
        startedAt: attempt?.startedAt ?? null,
        completedAt: attempt?.completedAt ?? null,
        penaltyPoints: Number(attempt?.penaltyPoints ?? 0),
        questions: questions.map((question) => ({
            id: question.id,
            type: question.type,
            text: question.text,
            options: question.options,
            points: question.points,
            answer: parseStoredCorrectAnswer(answerMap.get(question.id)?.answer ?? null),
            isCorrect: answerMap.get(question.id)?.isCorrect ?? null,
            correctAnswer: attempt?.completedAt ? question.correctAnswer : null,
            earnedPoints: answerMap.get(question.id)?.score ?? null,
        })),
    };
}
async function saveQuizQuestionsForTeacher(userId, quizId, questions) {
    const access = await ensureTeacherQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { quiz, cls } = access;
    const existingRows = await QuizQuestion_model_1.QuizQuestion.findAll({
        where: { quizId: quiz.id },
    });
    const existingQuestionIds = new Set(existingRows.map((row) => Number(row.questionId)));
    const nextQuestionIds = new Set();
    await QuizQuestion_model_1.QuizQuestion.destroy({ where: { quizId: quiz.id } });
    for (let index = 0; index < questions.length; index += 1) {
        const item = questions[index];
        const type = (item.type ?? "multiple_choice");
        const text = String(item.text ?? "").trim();
        if (!text)
            continue;
        const options = type === "multiple_choice" || type === "checkbox" || type === "true_false"
            ? type === "true_false"
                ? ["True", "False"]
                : parseOptions(item.options)
            : [];
        let questionId = Number(item.id ?? 0);
        const payload = {
            subjectId: cls.subjectId ?? null,
            questionText: text,
            choicesJson: options,
            correctAnswer: serializeCorrectAnswer(item.correctAnswer, type),
            questionType: type,
            points: safePoints(item.points),
        };
        if (questionId && existingQuestionIds.has(questionId)) {
            await QuestionBank_model_1.QuestionBank.update(payload, { where: { id: questionId } });
        }
        else {
            const question = await QuestionBank_model_1.QuestionBank.create(payload);
            questionId = Number(question.id);
        }
        nextQuestionIds.add(questionId);
        await QuizQuestion_model_1.QuizQuestion.create({
            quizId: Number(quiz.id),
            questionId,
            order: index + 1,
        });
    }
    await quiz.update({
        settingsJson: {
            ...parseSettings(quiz.settingsJson),
            questions: nextQuestionIds.size,
        },
    });
    return getQuizDetailForTeacher(userId, quizId);
}
async function startQuizForStudent(userId, quizId) {
    const access = await ensureStudentQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { student, quiz } = access;
    const settings = parseSettings(quiz.settingsJson);
    const existing = await QuizAttempt_model_1.QuizAttempt.findOne({
        where: { quizId: quiz.id, studentId: student.id },
    });
    if (settings.publishResults && !existing?.completedAt) {
        return "closed";
    }
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
        penaltyPoints: 0,
    });
}
async function submitQuizForStudent(userId, quizId, answers) {
    const access = await ensureStudentQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { student, quiz } = access;
    const settings = parseSettings(quiz.settingsJson);
    const questions = await getQuizQuestionsWithBank(Number(quiz.id));
    const answerMap = new Map();
    for (const item of Array.isArray(answers) ? answers : []) {
        if (!item?.questionId)
            continue;
        answerMap.set(Number(item.questionId), item.answer);
    }
    let attempt = await QuizAttempt_model_1.QuizAttempt.findOne({
        where: { quizId: quiz.id, studentId: student.id },
    });
    if (settings.publishResults && !attempt?.completedAt) {
        return "closed";
    }
    if (!attempt) {
        attempt = await QuizAttempt_model_1.QuizAttempt.create({
            quizId: Number(quiz.id),
            studentId: Number(student.id),
            startedAt: new Date(),
            completedAt: null,
            score: 0,
            penaltyPoints: 0,
        });
    }
    const totalAutoGradedPoints = questions
        .filter((question) => question.type !== "short_answer")
        .reduce((sum, question) => sum + question.points, 0);
    let earnedPoints = 0;
    let manualReviewCount = 0;
    for (const question of questions) {
        const studentAnswer = answerMap.get(question.id);
        const isCorrect = answersMatch(question, studentAnswer);
        const questionScore = isCorrect === true ? question.points : 0;
        if (question.type === "short_answer") {
            manualReviewCount += 1;
        }
        else {
            earnedPoints += questionScore;
        }
        const payload = {
            answer: JSON.stringify(studentAnswer ?? null),
            isCorrect,
            score: question.type === "short_answer" ? null : questionScore,
        };
        const existing = await QuizAttemptAnswer_model_1.QuizAttemptAnswer.findOne({
            where: { attemptId: attempt.id, questionId: question.id },
        });
        if (existing) {
            await existing.update(payload);
        }
        else {
            await QuizAttemptAnswer_model_1.QuizAttemptAnswer.create({
                attemptId: Number(attempt.id),
                questionId: question.id,
                ...payload,
            });
        }
    }
    const penaltyPoints = Number(attempt.penaltyPoints ?? 0);
    const adjustedEarnedPoints = Math.max(0, earnedPoints - penaltyPoints);
    const percentageScore = (0, calculations_1.calculateQuizScore)(earnedPoints, totalAutoGradedPoints, penaltyPoints);
    await attempt.update({
        startedAt: attempt.startedAt ?? new Date(),
        completedAt: new Date(),
        score: percentageScore,
    });
    return {
        attempt,
        result: {
            score: percentageScore,
            earnedPoints: adjustedEarnedPoints,
            totalPoints: totalAutoGradedPoints,
            manualReviewCount,
            penaltyPoints,
        },
    };
}
async function leaveQuizForStudent(userId, quizId) {
    const access = await ensureStudentQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { student, quiz } = access;
    const attempt = await QuizAttempt_model_1.QuizAttempt.findOne({
        where: { quizId: quiz.id, studentId: student.id },
    });
    if (!attempt || !attempt.startedAt || !!attempt.completedAt)
        return false;
    const nextPenalty = Number(attempt.penaltyPoints ?? 0) + QUIZ_LEAVE_PENALTY_POINTS;
    await attempt.update({ penaltyPoints: nextPenalty });
    return {
        penaltyPoints: nextPenalty,
        deductedPoints: QUIZ_LEAVE_PENALTY_POINTS,
    };
}
async function listQuizResultsForTeacher(userId, quizId) {
    const access = await ensureTeacherQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { quiz, cls } = access;
    const { enrolledStudents, attempts } = await getAttemptsForQuizEnrolledStudents(quiz, cls);
    const latestAttemptByStudent = new Map();
    for (const attempt of attempts) {
        const studentId = Number(attempt.studentId);
        const existing = latestAttemptByStudent.get(studentId);
        if (!existing || attempt.updatedAt > existing.updatedAt) {
            latestAttemptByStudent.set(studentId, attempt);
        }
    }
    return enrolledStudents.map((student) => {
        const attempt = latestAttemptByStudent.get(Number(student.id));
        const firstName = String(student.firstName ?? "").trim();
        const lastName = String(student.lastName ?? "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() ||
            "No Name Available";
        return {
            id: Number(attempt?.id ?? student.id),
            studentId: Number(student.id),
            studentName: fullName,
            status: attempt?.completedAt
                ? "Submitted"
                : attempt?.startedAt
                    ? "In Progress"
                    : "Not Started",
            score: Number(attempt?.score ?? 0),
            timeTaken: timeTakenLabel(attempt?.startedAt, attempt?.completedAt),
        };
    });
}
async function getQuizAnalyticsForTeacher(userId, quizId) {
    const access = await ensureTeacherQuizAccess(userId, quizId);
    if (!access)
        return access;
    const { quiz, cls } = access;
    const questions = await getQuizQuestionsWithBank(Number(quiz.id));
    const results = (await listQuizResultsForTeacher(userId, quizId));
    const completedAttempts = await QuizAttempt_model_1.QuizAttempt.findAll({
        where: { quizId: quiz.id },
    });
    const completedAttemptIds = completedAttempts
        .filter((item) => !!item.completedAt)
        .map((item) => Number(item.id));
    const answerRows = completedAttemptIds.length
        ? await QuizAttemptAnswer_model_1.QuizAttemptAnswer.findAll({
            where: { attemptId: completedAttemptIds },
        })
        : [];
    const answersByQuestion = new Map();
    for (const answer of answerRows) {
        const list = answersByQuestion.get(Number(answer.questionId)) ?? [];
        list.push(answer);
        answersByQuestion.set(Number(answer.questionId), list);
    }
    const { enrolledStudents } = await getAttemptsForQuizEnrolledStudents(quiz, cls);
    return {
        totalStudents: enrolledStudents.length,
        submitted: results.filter((item) => item.status === "Submitted").length,
        notSubmitted: results.filter((item) => item.status === "Not Started")
            .length,
        inProgress: results.filter((item) => item.status === "In Progress").length,
        averageScore: results.filter((item) => item.status === "Submitted").length
            ? Math.round(results
                .filter((item) => item.status === "Submitted")
                .reduce((sum, item) => sum + Number(item.score ?? 0), 0) /
                results.filter((item) => item.status === "Submitted").length)
            : 0,
        studentScores: results,
        questionStats: questions.map((question, index) => {
            const rows = answersByQuestion.get(question.id) ?? [];
            const checkedRows = rows.filter((row) => row.isCorrect !== null);
            const correctCount = checkedRows.filter((row) => !!row.isCorrect).length;
            return {
                id: question.id,
                order: index + 1,
                text: question.text,
                type: question.type,
                points: question.points,
                submissions: rows.length,
                correctCount,
                correctRate: checkedRows.length
                    ? Math.round((correctCount / checkedRows.length) * 100)
                    : 0,
            };
        }),
    };
}
