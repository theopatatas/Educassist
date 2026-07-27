import type { Request, Response } from "express";
import { Assignment } from "../../db/models/Assignment.model";
import { ClassTakeover } from "../../db/models/ClassTakeover.model";
import { Exam } from "../../db/models/Exam.model";
import { LeaveAffectedClass } from "../../db/models/LeaveAffectedClass.model";
import { LessonPlan } from "../../db/models/LessonPlan.model";
import { Quiz } from "../../db/models/Quiz.model";
import { SystemAuditLog } from "../../db/models/SystemAuditLog.model";
import { TakeoverActivity } from "../../db/models/TakeoverActivity.model";
import { Teacher } from "../../db/models/Teacher.model";
import { TeacherLeaveRequest } from "../../db/models/TeacherLeaveRequest.model";
import type { AuthenticatedUser } from "../../types/auth";

export type ActiveTakeoverContext = {
  leaveId: number;
  takeoverId: number;
  teacherId: number;
  teacherUserId: number;
  actor: AuthenticatedUser;
  classIds: number[];
  classes: Array<{
    classId: number;
    subjectName: string | null;
    gradeLevel: string | null;
    sectionName: string | null;
  }>;
};

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

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function appliesToTakeoverApi(req: Request) {
  const path = req.originalUrl.split("?")[0];
  return TAKEOVER_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function forbidden(res: Response, message: string) {
  return res.status(403).json({
    ok: false,
    code: "TAKEOVER_SCOPE_VIOLATION",
    message,
  });
}

async function resourceClassId(path: string) {
  const resourceMatch = path.match(
    /^\/api\/(quizzes|assignments|exams)\/(\d+)/,
  );
  if (!resourceMatch) return null;
  const id = Number(resourceMatch[2]);
  if (resourceMatch[1] === "quizzes")
    return Number((await Quiz.findByPk(id))?.classId ?? 0);
  if (resourceMatch[1] === "assignments")
    return Number((await Assignment.findByPk(id))?.classId ?? 0);
  return Number((await Exam.findByPk(id))?.classId ?? 0);
}

function matchesAffectedClass(
  context: ActiveTakeoverContext,
  input: Record<string, unknown>,
) {
  const subject = normalized(input.subject);
  const grade = normalized(input.gradeLevel);
  const section = normalized(input.section);
  if (!subject && !grade && !section) return true;
  return context.classes.some(
    (item) =>
      (!subject || normalized(item.subjectName) === subject) &&
      (!grade || normalized(item.gradeLevel) === grade) &&
      (!section || normalized(item.sectionName) === section),
  );
}

function filterRows(value: unknown, allowed: Set<number>) {
  if (!Array.isArray(value)) return value;
  return value.filter((row) => {
    if (!row || typeof row !== "object") return true;
    const classId = Number((row as Record<string, unknown>).classId ?? 0);
    return classId > 0 && allowed.has(classId);
  });
}

function installResponseScope(
  res: Response,
  context: ActiveTakeoverContext,
) {
  const allowed = new Set(context.classIds);
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (!body || typeof body !== "object") return originalJson(body);
    const scoped = { ...(body as Record<string, unknown>) };
    if (Array.isArray(scoped.classes)) {
      scoped.classes = scoped.classes.filter((row) => {
        if (!row || typeof row !== "object") return false;
        const value = row as Record<string, unknown>;
        return allowed.has(Number(value.classId ?? value.id ?? 0));
      });
    }
    for (const key of [
      "quizzes",
      "assignments",
      "exams",
      "records",
    ]) {
      if (key in scoped) scoped[key] = filterRows(scoped[key], allowed);
    }
    for (const key of ["lessonPlans", "plans"]) {
      if (!Array.isArray(scoped[key])) continue;
      scoped[key] = scoped[key].filter((plan) => {
        if (!plan || typeof plan !== "object") return false;
        return matchesAffectedClass(
          context,
          plan as Record<string, unknown>,
        );
      });
    }
    return originalJson(scoped);
  }) as Response["json"];
}

function activityLabel(req: Request) {
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

function recordSuccessfulMutation(
  req: Request,
  res: Response,
  context: ActiveTakeoverContext,
) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  res.once("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    const bodyClassId = Number(req.body?.classId ?? 0);
    const recordClassId = Array.isArray(req.body?.records)
      ? Number(req.body.records[0]?.classId ?? 0)
      : 0;
    const classId =
      bodyClassId || recordClassId || context.classIds[0] || null;
    const action = activityLabel(req);
    const details = `Super Admin performed ${req.method} ${req.originalUrl.split("?")[0]} through the active Teacher workspace.`;
    void Promise.all([
      TakeoverActivity.create({
        takeoverId: context.takeoverId,
        classId,
        userId: Number(context.actor.sub),
        action,
        previousValue: null,
        newValue: null,
        details,
      }),
      SystemAuditLog.create({
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

export async function applyActiveTakeoverContext(
  req: Request,
  res: Response,
) {
  const rawHeader = req.headers[TAKEOVER_HEADER];
  if (!rawHeader || !appliesToTakeoverApi(req)) return true;
  if (req.user?.role !== "super_admin") {
    forbidden(res, "Only the Super Admin can use an active takeover workspace.");
    return false;
  }
  const leaveId = Number(Array.isArray(rawHeader) ? rawHeader[0] : rawHeader);
  if (!Number.isInteger(leaveId) || leaveId <= 0) {
    forbidden(res, "The takeover workspace identifier is invalid.");
    return false;
  }
  const leave = await TeacherLeaveRequest.findOne({
    where: { id: leaveId, status: "ACTIVE_LEAVE" },
  });
  if (!leave) {
    forbidden(res, "This teacher leave is not currently active.");
    return false;
  }
  const [takeover, teacher, affected] = await Promise.all([
    ClassTakeover.findOne({
      where: { leaveRequestId: leave.id, status: "ACTIVE" },
    }),
    Teacher.findByPk(leave.teacherId),
    LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } }),
  ]);
  if (!takeover || !teacher || !affected.length) {
    forbidden(res, "An active class takeover could not be found.");
    return false;
  }
  const actor = req.user;
  const context: ActiveTakeoverContext = {
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
  if (
    ["PATCH", "DELETE"].includes(req.method) &&
    classPath &&
    !path.includes("/grades") &&
    !path.includes("/attendance")
  ) {
    forbidden(res, "Class ownership cannot be changed during a takeover.");
    return false;
  }
  const bodyClassId = Number(req.body?.classId ?? 0);
  if (bodyClassId && !allowed.has(bodyClassId)) {
    forbidden(res, "This class is outside the active takeover.");
    return false;
  }
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  if (
    records.some(
      (record: { classId?: unknown }) =>
        !allowed.has(Number(record.classId ?? 0)),
    )
  ) {
    forbidden(res, "One or more records are outside the active takeover.");
    return false;
  }
  const entityClassId = await resourceClassId(path);
  if (entityClassId !== null && !allowed.has(entityClassId)) {
    forbidden(res, "This record belongs to a class outside the takeover.");
    return false;
  }
  const lessonPlanMatch = path.match(
    /^\/api\/teacher-assistant\/lesson-plans\/(\d+)/,
  );
  if (lessonPlanMatch) {
    const plan = await LessonPlan.findByPk(Number(lessonPlanMatch[1]));
    if (
      !plan ||
      Number(plan.teacherId) !== context.teacherId ||
      !matchesAffectedClass(context, {
        subject: plan.subject,
        gradeLevel: plan.gradeLevel,
      })
    ) {
      forbidden(res, "This lesson plan is outside the active takeover.");
      return false;
    }
  }
  if (
    (path.includes("/grades/me") ||
      path.includes("/teacher-assistant/lesson")) &&
    !matchesAffectedClass(context, {
      ...(req.query as Record<string, unknown>),
      ...(req.body as Record<string, unknown>),
    })
  ) {
    forbidden(res, "The selected subject, grade, or section is outside the takeover.");
    return false;
  }

  req.takeoverContext = context;
  req.user = { ...actor, sub: String(teacher.userId), role: "teacher" };
  installResponseScope(res, context);
  recordSuccessfulMutation(req, res, context);
  return true;
}
