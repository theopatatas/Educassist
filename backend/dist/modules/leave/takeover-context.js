"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyActiveTakeoverContext = applyActiveTakeoverContext;
const Assignment_model_1 = require("../../db/models/Assignment.model");
const ClassTakeover_model_1 = require("../../db/models/ClassTakeover.model");
const Exam_model_1 = require("../../db/models/Exam.model");
const LeaveAffectedClass_model_1 = require("../../db/models/LeaveAffectedClass.model");
const LessonPlan_model_1 = require("../../db/models/LessonPlan.model");
const Quiz_model_1 = require("../../db/models/Quiz.model");
const SystemAuditLog_model_1 = require("../../db/models/SystemAuditLog.model");
const TakeoverActivity_model_1 = require("../../db/models/TakeoverActivity.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const TeacherLeaveRequest_model_1 = require("../../db/models/TeacherLeaveRequest.model");
const TAKEOVER_HEADER = "x-educassist-takeover";
const TAKEOVER_API_PREFIXES = [
    "/api/classes",
    "/api/quizzes",
    "/api/exams",
    "/api/assignments",
    "/api/teacher-assistant",
    "/api/ai",
    "/api/teachers/me",
    "/api/events",
];
function normalized(value) {
    return String(value ?? "").trim().toLowerCase();
}
function appliesToTakeoverApi(req) {
    const path = req.originalUrl.split("?")[0];
    return TAKEOVER_API_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
function forbidden(res, message) {
    return res.status(403).json({
        ok: false,
        code: "TAKEOVER_SCOPE_VIOLATION",
        message,
    });
}
async function resourceClassId(path) {
    const resourceMatch = path.match(/^\/api\/(quizzes|assignments|exams)\/(\d+)/);
    if (!resourceMatch)
        return null;
    const id = Number(resourceMatch[2]);
    if (resourceMatch[1] === "quizzes")
        return Number((await Quiz_model_1.Quiz.findByPk(id))?.classId ?? 0);
    if (resourceMatch[1] === "assignments")
        return Number((await Assignment_model_1.Assignment.findByPk(id))?.classId ?? 0);
    return Number((await Exam_model_1.Exam.findByPk(id))?.classId ?? 0);
}
function matchesAffectedClass(context, input) {
    const subject = normalized(input.subject);
    const grade = normalized(input.gradeLevel);
    const section = normalized(input.section);
    if (!subject && !grade && !section)
        return true;
    return context.classes.some((item) => (!subject || normalized(item.subjectName) === subject) &&
        (!grade || normalized(item.gradeLevel) === grade) &&
        (!section || normalized(item.sectionName) === section));
}
function filterRows(value, allowed) {
    if (!Array.isArray(value))
        return value;
    return value.filter((row) => {
        if (!row || typeof row !== "object")
            return true;
        const classId = Number(row.classId ?? 0);
        return classId > 0 && allowed.has(classId);
    });
}
function installResponseScope(res, context) {
    const allowed = new Set(context.classIds);
    const originalJson = res.json.bind(res);
    res.json = ((body) => {
        if (!body || typeof body !== "object")
            return originalJson(body);
        const scoped = { ...body };
        if (Array.isArray(scoped.classes)) {
            scoped.classes = scoped.classes.filter((row) => {
                if (!row || typeof row !== "object")
                    return false;
                const value = row;
                return allowed.has(Number(value.classId ?? value.id ?? 0));
            });
        }
        for (const key of [
            "quizzes",
            "assignments",
            "exams",
            "records",
        ]) {
            if (key in scoped)
                scoped[key] = filterRows(scoped[key], allowed);
        }
        for (const key of ["lessonPlans", "plans"]) {
            if (!Array.isArray(scoped[key]))
                continue;
            scoped[key] = scoped[key].filter((plan) => {
                if (!plan || typeof plan !== "object")
                    return false;
                return matchesAffectedClass(context, plan);
            });
        }
        return originalJson(scoped);
    });
}
function activityLabel(req) {
    const path = req.originalUrl.split("?")[0];
    const moduleName = path.includes("/quizzes")
        ? "QUIZ"
        : path.includes("/assignments")
            ? "ASSIGNMENT"
            : path.includes("/exams")
                ? "EXAM"
                : path.includes("/attendance")
                    ? "ATTENDANCE"
                    : path.includes("/grades")
                        ? "GRADES"
                        : path.includes("/teacher-assistant")
                            ? "TEACHER_ASSISTANT"
                            : path.includes("/ai")
                                ? "AI_ASSISTANT"
                                : "CLASS";
    return `${moduleName}_${req.method}`;
}
function recordSuccessfulMutation(req, res, context) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method))
        return;
    res.once("finish", () => {
        if (res.statusCode < 200 || res.statusCode >= 400)
            return;
        const bodyClassId = Number(req.body?.classId ?? 0);
        const recordClassId = Array.isArray(req.body?.records)
            ? Number(req.body.records[0]?.classId ?? 0)
            : 0;
        const classId = bodyClassId || recordClassId || context.classIds[0] || null;
        const action = activityLabel(req);
        const details = `Super Admin performed ${req.method} ${req.originalUrl.split("?")[0]} through the active Teacher workspace.`;
        void Promise.all([
            TakeoverActivity_model_1.TakeoverActivity.create({
                takeoverId: context.takeoverId,
                classId,
                userId: Number(context.actor.sub),
                action,
                previousValue: null,
                newValue: null,
                details,
            }),
            SystemAuditLog_model_1.SystemAuditLog.create({
                userId: Number(context.actor.sub),
                role: String(context.actor.role),
                action,
                entityType: "teacher_takeover_workspace",
                entityId: context.leaveId,
                affectedTeacherId: context.teacherId,
                affectedClassIds: context.classIds,
                ipAddress: req.ip ?? null,
                deviceInfo: req.get("user-agent") ?? null,
                metadata: { method: req.method, path: req.originalUrl.split("?")[0] },
            }),
        ]).catch(() => undefined);
    });
}
async function applyActiveTakeoverContext(req, res) {
    const rawHeader = req.headers[TAKEOVER_HEADER];
    if (!rawHeader || !appliesToTakeoverApi(req))
        return true;
    if (req.user?.role !== "super_admin") {
        forbidden(res, "Only the Super Admin can use an active takeover workspace.");
        return false;
    }
    const leaveId = Number(Array.isArray(rawHeader) ? rawHeader[0] : rawHeader);
    if (!Number.isInteger(leaveId) || leaveId <= 0) {
        forbidden(res, "The takeover workspace identifier is invalid.");
        return false;
    }
    const leave = await TeacherLeaveRequest_model_1.TeacherLeaveRequest.findOne({
        where: { id: leaveId, status: "ACTIVE_LEAVE" },
    });
    if (!leave) {
        forbidden(res, "This teacher leave is not currently active.");
        return false;
    }
    const [takeover, teacher, affected] = await Promise.all([
        ClassTakeover_model_1.ClassTakeover.findOne({
            where: { leaveRequestId: leave.id, status: "ACTIVE" },
        }),
        Teacher_model_1.Teacher.findByPk(leave.teacherId),
        LeaveAffectedClass_model_1.LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } }),
    ]);
    if (!takeover || !teacher || !affected.length) {
        forbidden(res, "An active class takeover could not be found.");
        return false;
    }
    const actor = req.user;
    const context = {
        leaveId,
        takeoverId: Number(takeover.id),
        teacherId: Number(teacher.id),
        teacherUserId: Number(teacher.userId),
        actor,
        classIds: affected.map((item) => Number(item.classId)),
        classes: affected.map((item) => ({
            classId: Number(item.classId),
            subjectName: item.subjectName,
            gradeLevel: item.gradeLevel,
            sectionName: item.sectionName,
        })),
    };
    const allowed = new Set(context.classIds);
    const path = req.originalUrl.split("?")[0];
    if (req.method === "POST" && path === "/api/classes/me") {
        forbidden(res, "Class ownership cannot be changed during a takeover.");
        return false;
    }
    const classPath = path.match(/^\/api\/classes\/(\d+)/);
    if (classPath && !allowed.has(Number(classPath[1]))) {
        forbidden(res, "This class is outside the active takeover.");
        return false;
    }
    if (["PATCH", "DELETE"].includes(req.method) &&
        classPath &&
        !path.includes("/grades") &&
        !path.includes("/attendance")) {
        forbidden(res, "Class ownership cannot be changed during a takeover.");
        return false;
    }
    const bodyClassId = Number(req.body?.classId ?? 0);
    if (bodyClassId && !allowed.has(bodyClassId)) {
        forbidden(res, "This class is outside the active takeover.");
        return false;
    }
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    if (records.some((record) => !allowed.has(Number(record.classId ?? 0)))) {
        forbidden(res, "One or more records are outside the active takeover.");
        return false;
    }
    const entityClassId = await resourceClassId(path);
    if (entityClassId !== null && !allowed.has(entityClassId)) {
        forbidden(res, "This record belongs to a class outside the takeover.");
        return false;
    }
    const lessonPlanMatch = path.match(/^\/api\/teacher-assistant\/lesson-plans\/(\d+)/);
    if (lessonPlanMatch) {
        const plan = await LessonPlan_model_1.LessonPlan.findByPk(Number(lessonPlanMatch[1]));
        if (!plan ||
            Number(plan.teacherId) !== context.teacherId ||
            !matchesAffectedClass(context, {
                subject: plan.subject,
                gradeLevel: plan.gradeLevel,
            })) {
            forbidden(res, "This lesson plan is outside the active takeover.");
            return false;
        }
    }
    if ((path.includes("/grades/me") ||
        path.includes("/teacher-assistant/lesson")) &&
        !matchesAffectedClass(context, {
            ...req.query,
            ...req.body,
        })) {
        forbidden(res, "The selected subject, grade, or section is outside the takeover.");
        return false;
    }
    req.takeoverContext = context;
    req.user = { ...actor, sub: String(teacher.userId), role: "teacher" };
    installResponseScope(res, context);
    recordSuccessfulMutation(req, res, context);
    return true;
}
