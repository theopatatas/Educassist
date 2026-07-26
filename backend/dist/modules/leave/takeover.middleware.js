"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockTakenOverClassParam = blockTakenOverClassParam;
exports.blockTakenOverBodyClass = blockTakenOverBodyClass;
exports.blockTakenOverAttendance = blockTakenOverAttendance;
exports.blockTakenOverAssignment = blockTakenOverAssignment;
exports.blockTakenOverQuiz = blockTakenOverQuiz;
exports.blockTakenOverExam = blockTakenOverExam;
exports.blockTakenOverGradeSelection = blockTakenOverGradeSelection;
const models_1 = require("../../db/models");
const leave_service_1 = require("./leave.service");
function locked(res) {
    return res.status(423).json({
        ok: false,
        code: "CLASS_TAKEOVER_ACTIVE",
        message: "This class is temporarily managed by the Super Admin during your approved leave.",
    });
}
async function activeIds(req) {
    return new Set(await (0, leave_service_1.activeTakeoverClassIdsForTeacher)(String(req.user?.sub ?? "")));
}
async function blockTakenOverClassParam(req, res, next) {
    if ((await activeIds(req)).has(Number(req.params.id)))
        return locked(res);
    return next();
}
async function blockTakenOverBodyClass(req, res, next) {
    const classId = Number(req.body?.classId);
    if (classId && (await activeIds(req)).has(classId))
        return locked(res);
    return next();
}
async function blockTakenOverAttendance(req, res, next) {
    const lockedIds = await activeIds(req);
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    if (records.some((record) => lockedIds.has(Number(record.classId)))) {
        return locked(res);
    }
    return next();
}
async function blockTakenOverAssignment(req, res, next) {
    const assignment = await models_1.Assignment.findByPk(req.params.id);
    if (assignment?.classId &&
        (await activeIds(req)).has(Number(assignment.classId))) {
        return locked(res);
    }
    return next();
}
async function blockTakenOverQuiz(req, res, next) {
    const quiz = await models_1.Quiz.findByPk(req.params.id);
    if (quiz?.classId && (await activeIds(req)).has(Number(quiz.classId))) {
        return locked(res);
    }
    return next();
}
async function blockTakenOverExam(req, res, next) {
    const exam = await models_1.Exam.findByPk(req.params.id);
    if (exam?.classId && (await activeIds(req)).has(Number(exam.classId))) {
        return locked(res);
    }
    return next();
}
async function blockTakenOverGradeSelection(req, res, next) {
    const lockedIds = await activeIds(req);
    if (!lockedIds.size)
        return next();
    const classes = await models_1.Class.findAll({
        where: { id: [...lockedIds] },
    });
    const [subjects, sections] = await Promise.all([
        models_1.Subject.findAll(),
        models_1.Section.findAll(),
    ]);
    const subjectMap = new Map(subjects.map((item) => [Number(item.id), item.name.toLowerCase()]));
    const sectionMap = new Map(sections.map((item) => [Number(item.id), item.name.toLowerCase()]));
    const selectedSubject = String(req.body?.subject ?? "").trim().toLowerCase();
    const selectedSection = String(req.body?.section ?? "").trim().toLowerCase();
    const selectedGrade = String(req.body?.gradeLevel ?? "").trim().toLowerCase();
    const matchesLockedClass = classes.some((item) => (!selectedSubject ||
        subjectMap.get(Number(item.subjectId)) === selectedSubject) &&
        (!selectedSection ||
            sectionMap.get(Number(item.sectionId)) === selectedSection ||
            String(item.name ?? "").toLowerCase() === selectedSection) &&
        (!selectedGrade ||
            String(item.gradeLevel ?? "").toLowerCase() === selectedGrade));
    if (matchesLockedClass)
        return locked(res);
    return next();
}
