import { Op } from "sequelize";
import {
  Class,
  ClassTakeover,
  Enrollment,
  LeaveAffectedClass,
  Section,
  Subject,
  SystemAuditLog,
  SystemNotification,
  TakeoverActivity,
  Teacher,
  TeacherLeaveRequest,
  User,
} from "../../db/models";
import type { AuthenticatedUser } from "../../types/auth";
import {
  getPublishedGradesForTeacher,
  listAttendanceForTeacher,
  listStudentsForTeacherClass,
  saveAttendanceForTeacher,
  savePublishedGradesForTeacher,
} from "../classes/classes.service";
import {
  createAssignmentForTeacher,
  listAssignmentsForTeacher,
} from "../assignments/assignments.service";

const leaveTypes = new Set([
  "Sick Leave",
  "Vacation Leave",
  "Emergency Leave",
  "Official Business",
  "Maternity Leave",
  "Paternity Leave",
  "Bereavement Leave",
  "Other",
]);

type RequestContext = {
  user: AuthenticatedUser;
  ip?: string;
  device?: string;
};

function dateOnly(value: unknown) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function calculateLeaveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

async function teacherForUser(userId: string | number) {
  return Teacher.findOne({ where: { userId } });
}

async function superAdminUsers() {
  return User.findAll({ where: { role: "SUPER_ADMIN", isActive: true } });
}

async function notify(
  userId: number,
  title: string,
  message: string,
  href: string,
  category = "leave",
) {
  await SystemNotification.create({
    userId,
    title,
    message,
    category,
    href,
  });
}

async function audit(
  context: RequestContext,
  action: string,
  leave: TeacherLeaveRequest,
  classIds: number[],
  metadata?: Record<string, unknown>,
) {
  await SystemAuditLog.create({
    userId: Number(context.user.sub),
    role: String(context.user.role),
    action,
    entityType: "teacher_leave_request",
    entityId: leave.id,
    affectedTeacherId: leave.teacherId,
    affectedClassIds: classIds,
    ipAddress: context.ip ?? null,
    deviceInfo: context.device ?? null,
    metadata: metadata ?? null,
  });
}

async function affectedClassesForTeacher(teacherId: number) {
  const classes = await Class.findAll({ where: { teacherId }, order: [["id", "ASC"]] });
  const subjectIds = classes.map((item) => item.subjectId).filter(Boolean) as number[];
  const sectionIds = classes.map((item) => item.sectionId).filter(Boolean) as number[];
  const [subjects, sections, enrollments] = await Promise.all([
    Subject.findAll({ where: { id: { [Op.in]: subjectIds.length ? subjectIds : [0] } } }),
    Section.findAll({ where: { id: { [Op.in]: sectionIds.length ? sectionIds : [0] } } }),
    Enrollment.findAll({ where: { classId: { [Op.in]: classes.length ? classes.map((item) => item.id) : [0] } } }),
  ]);
  const subjectMap = new Map(subjects.map((item) => [Number(item.id), item.name]));
  const sectionMap = new Map(sections.map((item) => [Number(item.id), item.name]));
  const counts = new Map<number, number>();
  enrollments.forEach((item) =>
    counts.set(Number(item.classId), (counts.get(Number(item.classId)) ?? 0) + 1),
  );
  return classes.map((item) => ({
    classId: Number(item.id),
    subjectName: item.subjectId ? subjectMap.get(Number(item.subjectId)) ?? null : item.name,
    gradeLevel: item.gradeLevel,
    sectionName: item.sectionId ? sectionMap.get(Number(item.sectionId)) ?? null : null,
    schedule:
      [
        item.meetingDay,
        item.meetingTime?.includes("|")
          ? item.meetingTime.split("|", 2)[1]
          : item.meetingTime,
      ]
        .filter(Boolean)
        .join(" • ") || null,
    studentCount: counts.get(Number(item.id)) ?? 0,
  }));
}

async function serializeLeave(leave: TeacherLeaveRequest) {
  const [teacher, classes, takeover, reviewer] = await Promise.all([
    Teacher.findByPk(leave.teacherId),
    LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id }, order: [["id", "ASC"]] }),
    ClassTakeover.findOne({ where: { leaveRequestId: leave.id } }),
    leave.reviewedByUserId ? User.findByPk(leave.reviewedByUserId) : null,
  ]);
  return {
    ...leave.toJSON(),
    teacher: teacher
      ? {
          id: teacher.id,
          name: [teacher.firstName, teacher.middleName, teacher.lastName].filter(Boolean).join(" "),
          employeeNumber: teacher.employeeNumber,
          gradeLevel: teacher.gradeLevel,
        }
      : null,
    affectedClasses: classes,
    takeover: takeover ?? { status: "NOT_STARTED" },
    reviewer: reviewer
      ? { id: reviewer.id, name: reviewer.displayName || [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") || reviewer.email }
      : null,
  };
}

export async function reconcileLeavePeriods() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const nearingEnd = await TeacherLeaveRequest.findAll({
    where: {
      endDate: { [Op.in]: [today, tomorrow] },
      status: "ACTIVE_LEAVE",
    },
  });
  for (const leave of nearingEnd) {
    for (const admin of await superAdminUsers()) {
      const marker = `Leave #${leave.id}`;
      const existing = await SystemNotification.findOne({
        where: {
          userId: admin.id,
          category: "takeover_nearing_end",
          message: { [Op.like]: `${marker}%` },
        },
      });
      if (!existing) {
        await notify(
          admin.id,
          "Active takeover nearing end",
          `${marker} ends on ${leave.endDate}.`,
          "/admin/leave-management",
          "takeover_nearing_end",
        );
      }
    }
  }
  const expired = await TeacherLeaveRequest.findAll({
    where: {
      endDate: { [Op.lt]: today },
      status: { [Op.in]: ["APPROVED", "ACTIVE_LEAVE"] },
    },
  });
  for (const leave of expired) {
    const takeover = await ClassTakeover.findOne({ where: { leaveRequestId: leave.id } });
    if (takeover?.status === "ACTIVE") {
      await takeover.update({ status: "COMPLETED", endedAt: new Date(), completionSummary: "Automatically completed when the approved leave period expired." });
      await TakeoverActivity.create({
        takeoverId: takeover.id,
        classId: null,
        userId: Number(takeover.activatedByUserId ?? 0),
        action: "TAKEOVER_AUTO_COMPLETED",
        details: "Approved leave period expired.",
      });
    }
    await leave.update({ status: "COMPLETED" });
    const teacher = await Teacher.findByPk(leave.teacherId);
    if (teacher) {
      await notify(teacher.userId, "Leave completed", "Your leave period and any active class takeover have been completed.", "/teacher/leave-requests");
    }
    for (const admin of await superAdminUsers()) {
      await notify(
        admin.id,
        "Takeover completed",
        `Leave #${leave.id} and its temporary takeover were completed automatically.`,
        "/admin/leave-management",
      );
    }
  }
}

export async function listTeacherLeaves(userId: string) {
  await reconcileLeavePeriods();
  const teacher = await teacherForUser(userId);
  if (!teacher) return null;
  const rows = await TeacherLeaveRequest.findAll({ where: { teacherId: teacher.id }, order: [["submittedAt", "DESC"]] });
  return Promise.all(rows.map(serializeLeave));
}

export async function listAdminLeaves(filters: Record<string, unknown>) {
  await reconcileLeavePeriods();
  const where: Record<string, unknown> = {};
  const status = String(filters.status ?? "").toUpperCase();
  if (status && status !== "ALL") where.status = status;
  const rows = await TeacherLeaveRequest.findAll({ where, order: [["submittedAt", "DESC"]] });
  const serialized = await Promise.all(rows.map(serializeLeave));
  const query = String(filters.search ?? "").trim().toLowerCase();
  const filtered = query
    ? serialized.filter((item) =>
        [
          item.teacher?.name,
          item.leaveType,
          ...item.affectedClasses.flatMap((row: LeaveAffectedClass) => [
            row.subjectName,
            row.sectionName,
          ]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
    : serialized;
  const sort = String(filters.sort ?? "newest");
  return filtered.sort((left, right) => {
    if (sort === "oldest") return left.submittedAt.getTime() - right.submittedAt.getTime();
    if (sort === "start") return left.startDate.localeCompare(right.startDate);
    if (sort === "end") return left.endDate.localeCompare(right.endDate);
    return right.submittedAt.getTime() - left.submittedAt.getTime();
  });
}

export async function createLeave(
  context: RequestContext,
  input: Record<string, unknown>,
  attachmentUrl?: string,
) {
  const teacher = await teacherForUser(String(context.user.sub));
  if (!teacher) return { error: "Teacher profile not found", status: 404 };
  const leaveType = String(input.leaveType ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const startDate = dateOnly(input.startDate);
  const endDate = dateOnly(input.endDate);
  const days = calculateLeaveDays(startDate, endDate);
  if (!leaveTypes.has(leaveType) || !reason || !startDate || !endDate || !days) {
    return { error: "Leave type, reason, and a valid date range are required.", status: 400 };
  }
  const overlap = await TeacherLeaveRequest.findOne({
    where: {
      teacherId: teacher.id,
      status: { [Op.in]: ["APPROVED", "ACTIVE_LEAVE"] },
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    },
  });
  if (overlap) return { error: "These dates overlap an existing approved leave.", status: 409 };
  const leave = await TeacherLeaveRequest.create({
    teacherId: teacher.id,
    leaveType,
    reason,
    startDate,
    endDate,
    totalDays: days,
    status: "PENDING",
    attachmentUrl: attachmentUrl ?? null,
  });
  const classes = await affectedClassesForTeacher(teacher.id);
  if (classes.length) {
    await LeaveAffectedClass.bulkCreate(
      classes.map((item) => ({ leaveRequestId: leave.id, ...item })),
    );
  }
  await ClassTakeover.create({ leaveRequestId: leave.id, status: "NOT_STARTED" });
  await audit(context, "LEAVE_CREATED", leave, classes.map((item) => item.classId));
  await notify(teacher.userId, "Leave request submitted", "Your leave request was submitted for Super Admin review.", "/teacher/leave-requests");
  for (const admin of await superAdminUsers()) {
    await notify(admin.id, "New leave request", `${teacher.firstName} ${teacher.lastName} submitted a leave request.`, "/admin/leave-management");
  }
  return { leave: await serializeLeave(leave) };
}

export async function updatePendingLeave(
  context: RequestContext,
  id: string,
  input: Record<string, unknown>,
  attachmentUrl?: string,
) {
  const teacher = await teacherForUser(String(context.user.sub));
  if (!teacher) return { error: "Teacher profile not found", status: 404 };
  const leave = await TeacherLeaveRequest.findOne({ where: { id, teacherId: teacher.id } });
  if (!leave) return { error: "Leave request not found", status: 404 };
  if (leave.status !== "PENDING") return { error: "Only pending leave requests can be edited.", status: 409 };
  const leaveType = String(input.leaveType ?? leave.leaveType).trim();
  const reason = String(input.reason ?? leave.reason).trim();
  const startDate = dateOnly(input.startDate ?? leave.startDate);
  const endDate = dateOnly(input.endDate ?? leave.endDate);
  const days = calculateLeaveDays(startDate, endDate);
  if (!leaveTypes.has(leaveType) || !reason || !days) return { error: "Enter valid leave details.", status: 400 };
  const overlap = await TeacherLeaveRequest.findOne({
    where: {
      id: { [Op.ne]: leave.id },
      teacherId: teacher.id,
      status: { [Op.in]: ["APPROVED", "ACTIVE_LEAVE"] },
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    },
  });
  if (overlap)
    return {
      error: "These dates overlap an existing approved leave.",
      status: 409,
    };
  await leave.update({
    leaveType,
    reason,
    startDate,
    endDate,
    totalDays: days,
    ...(attachmentUrl ? { attachmentUrl } : {}),
  });
  const classIds = (await LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } })).map((item) => item.classId);
  await audit(context, "LEAVE_EDITED", leave, classIds);
  return { leave: await serializeLeave(leave) };
}

export async function cancelPendingLeave(context: RequestContext, id: string) {
  const teacher = await teacherForUser(String(context.user.sub));
  if (!teacher) return { error: "Teacher profile not found", status: 404 };
  const leave = await TeacherLeaveRequest.findOne({ where: { id, teacherId: teacher.id } });
  if (!leave) return { error: "Leave request not found", status: 404 };
  if (leave.status !== "PENDING") return { error: "Only pending leave requests can be cancelled.", status: 409 };
  await leave.update({ status: "CANCELLED" });
  const classIds = (await LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } })).map((item) => item.classId);
  await audit(context, "LEAVE_CANCELLED", leave, classIds);
  return { leave: await serializeLeave(leave) };
}

export async function reviewLeave(
  context: RequestContext,
  id: string,
  action: "approve" | "reject",
  input: Record<string, unknown>,
) {
  const leave = await TeacherLeaveRequest.findByPk(id);
  if (!leave) return { error: "Leave request not found", status: 404 };
  if (leave.status !== "PENDING") return { error: "Only pending requests can be reviewed.", status: 409 };
  const rejectionReason = String(input.rejectionReason ?? "").trim();
  if (action === "reject" && !rejectionReason) return { error: "Rejection reason is required.", status: 400 };
  await leave.update({
    status: action === "approve" ? "APPROVED" : "REJECTED",
    reviewNote: String(input.reviewNote ?? "").trim() || null,
    rejectionReason: action === "reject" ? rejectionReason : null,
    reviewedByUserId: Number(context.user.sub),
    reviewedAt: new Date(),
  });
  const teacher = await Teacher.findByPk(leave.teacherId);
  const classes = await LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } });
  await audit(context, action === "approve" ? "LEAVE_APPROVED" : "LEAVE_REJECTED", leave, classes.map((item) => item.classId), { reviewNote: leave.reviewNote, rejectionReason: leave.rejectionReason });
  if (teacher) {
    await notify(
      teacher.userId,
      action === "approve" ? "Leave approved" : "Leave rejected",
      action === "approve" ? "Your leave was approved. Takeover has not been started." : `Your leave was rejected: ${rejectionReason}`,
      "/teacher/leave-requests",
    );
  }
  if (action === "approve") {
    for (const admin of await superAdminUsers()) {
      await notify(admin.id, "Approved leave awaiting takeover", "An approved leave is waiting for manual takeover activation.", "/admin/leave-management");
    }
  }
  return { leave: await serializeLeave(leave) };
}

export async function startTakeover(context: RequestContext, id: string) {
  const leave = await TeacherLeaveRequest.findByPk(id);
  if (!leave) return { error: "Leave request not found", status: 404 };
  if (leave.status !== "APPROVED") return { error: "Only approved leave can start a takeover.", status: 409 };
  const today = new Date().toISOString().slice(0, 10);
  if (today < leave.startDate)
    return {
      error: "Takeover can only start on or after the approved leave start date.",
      status: 409,
    };
  if (today > leave.endDate)
    return { error: "The approved leave period has already ended.", status: 409 };
  const takeover = await ClassTakeover.findOne({ where: { leaveRequestId: leave.id } });
  if (!takeover || takeover.status !== "NOT_STARTED") return { error: "Takeover cannot be started.", status: 409 };
  const classes = await LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } });
  await takeover.update({ status: "ACTIVE", activatedByUserId: Number(context.user.sub), startedAt: new Date() });
  await leave.update({ status: "ACTIVE_LEAVE" });
  await TakeoverActivity.create({
    takeoverId: takeover.id,
    classId: null,
    userId: Number(context.user.sub),
    action: "TAKEOVER_STARTED",
    details: "Super Admin manually activated temporary class access.",
  });
  await audit(context, "TAKEOVER_ACTIVATED", leave, classes.map((item) => item.classId));
  const teacher = await Teacher.findByPk(leave.teacherId);
  if (teacher) await notify(teacher.userId, "Class takeover activated", "The Super Admin has started the approved temporary class takeover.", "/teacher/leave-requests");
  return { leave: await serializeLeave(leave) };
}

export async function createEmergencyTakeover(
  context: RequestContext,
  input: Record<string, unknown>,
) {
  const teacher = await Teacher.findByPk(Number(input.teacherId));
  const reason = String(input.reason ?? "").trim();
  const startDate = dateOnly(input.startDate);
  const endDate = dateOnly(input.endDate);
  const days = calculateLeaveDays(startDate, endDate);
  if (!teacher) return { error: "Teacher not found", status: 404 };
  if (!reason || !days) {
    return {
      error: "Teacher, reason, and a valid emergency leave period are required.",
      status: 400,
    };
  }
  const overlap = await TeacherLeaveRequest.findOne({
    where: {
      teacherId: teacher.id,
      status: { [Op.in]: ["APPROVED", "ACTIVE_LEAVE"] },
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    },
  });
  if (overlap) {
    return {
      error: "The teacher already has an approved leave during these dates.",
      status: 409,
    };
  }
  const leave = await TeacherLeaveRequest.create({
    teacherId: teacher.id,
    leaveType: "Emergency Leave",
    reason,
    startDate,
    endDate,
    totalDays: days,
    status: "APPROVED",
    reviewNote:
      String(input.reviewNote ?? "").trim() ||
      "Emergency leave and takeover created manually by the Super Admin.",
    reviewedByUserId: Number(context.user.sub),
    reviewedAt: new Date(),
  });
  const classes = await affectedClassesForTeacher(teacher.id);
  if (classes.length) {
    await LeaveAffectedClass.bulkCreate(
      classes.map((item) => ({ leaveRequestId: leave.id, ...item })),
    );
  }
  await ClassTakeover.create({
    leaveRequestId: leave.id,
    status: "NOT_STARTED",
  });
  await audit(
    context,
    "EMERGENCY_LEAVE_CREATED",
    leave,
    classes.map((item) => item.classId),
  );
  return startTakeover(context, String(leave.id));
}

export async function finishTakeover(
  context: RequestContext,
  id: string,
  action: "complete" | "cancel",
) {
  const leave = await TeacherLeaveRequest.findByPk(id);
  if (!leave) return { error: "Leave request not found", status: 404 };
  const takeover = await ClassTakeover.findOne({ where: { leaveRequestId: leave.id } });
  if (!takeover || takeover.status !== "ACTIVE") return { error: "No active takeover was found.", status: 409 };
  const classes = await LeaveAffectedClass.findAll({ where: { leaveRequestId: leave.id } });
  await takeover.update(
    action === "complete"
      ? { status: "COMPLETED", endedAt: new Date(), completionSummary: "Takeover manually completed by Super Admin." }
      : { status: "CANCELLED", cancelledAt: new Date(), endedAt: new Date(), completionSummary: "Takeover cancelled by Super Admin." },
  );
  await leave.update({ status: action === "complete" ? "COMPLETED" : "APPROVED" });
  await TakeoverActivity.create({
    takeoverId: takeover.id,
    classId: null,
    userId: Number(context.user.sub),
    action: action === "complete" ? "TAKEOVER_COMPLETED" : "TAKEOVER_CANCELLED",
    details: takeover.completionSummary,
  });
  await audit(context, action === "complete" ? "TAKEOVER_COMPLETED" : "TAKEOVER_CANCELLED", leave, classes.map((item) => item.classId));
  const teacher = await Teacher.findByPk(leave.teacherId);
  if (teacher) await notify(teacher.userId, action === "complete" ? "Class takeover completed" : "Class takeover cancelled", action === "complete" ? "Your teaching permissions for the affected classes have been restored." : "The temporary class takeover was cancelled and your permissions were restored.", "/teacher/leave-requests");
  for (const admin of await superAdminUsers()) {
    await notify(
      admin.id,
      action === "complete" ? "Takeover completed" : "Takeover cancelled",
      `Leave #${leave.id} takeover was ${action === "complete" ? "completed" : "cancelled"}.`,
      "/admin/leave-management",
    );
  }
  return { leave: await serializeLeave(leave) };
}

export async function takeoverActivities(userId: string, role: string, leaveId: string) {
  const leave = await TeacherLeaveRequest.findByPk(leaveId);
  if (!leave) return null;
  if (role === "teacher") {
    const teacher = await teacherForUser(userId);
    if (!teacher || Number(teacher.id) !== Number(leave.teacherId)) return null;
  }
  const takeover = await ClassTakeover.findOne({ where: { leaveRequestId: leave.id } });
  if (!takeover) return [];
  const rows = await TakeoverActivity.findAll({
    where: { takeoverId: takeover.id },
    order: [["createdAt", "DESC"]],
  });
  const users = await User.findAll({
    where: {
      id: {
        [Op.in]: rows.length
          ? rows.map((item) => item.userId).filter(Boolean)
          : [0],
      },
    },
  });
  const classes = await LeaveAffectedClass.findAll({
    where: { leaveRequestId: leave.id },
  });
  const userMap = new Map(
    users.map((item) => [
      Number(item.id),
      {
        id: item.id,
        name:
          item.displayName ||
          [item.firstName, item.lastName].filter(Boolean).join(" ") ||
          item.email,
        role: item.role,
      },
    ]),
  );
  const classMap = new Map(
    classes.map((item) => [
      Number(item.classId),
      [item.subjectName, item.gradeLevel, item.sectionName]
        .filter(Boolean)
        .join(" • "),
    ]),
  );
  return rows.map((item) => ({
    ...item.toJSON(),
    user: userMap.get(Number(item.userId)) ?? null,
    affectedClass: item.classId
      ? classMap.get(Number(item.classId)) ?? null
      : null,
  }));
}

export async function leaveAuditLogs(leaveId: string) {
  const rows = await SystemAuditLog.findAll({
    where: { entityType: "teacher_leave_request", entityId: leaveId },
    order: [["createdAt", "DESC"]],
  });
  const users = await User.findAll({
    where: {
      id: {
        [Op.in]: rows.length
          ? rows.map((item) => item.userId).filter(Boolean)
          : [0],
      },
    },
  });
  const userMap = new Map(
    users.map((item) => [
      Number(item.id),
      item.displayName ||
        [item.firstName, item.lastName].filter(Boolean).join(" ") ||
        item.email,
    ]),
  );
  return rows.map((item) => ({
    ...item.toJSON(),
    userName: userMap.get(Number(item.userId)) ?? "System",
  }));
}

export async function listNotifications(userId: string) {
  return SystemNotification.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit: 50 });
}

export async function markNotificationRead(userId: string, id?: string) {
  if (id) {
    await SystemNotification.update({ readAt: new Date() }, { where: { id, userId } });
  } else {
    await SystemNotification.update({ readAt: new Date() }, { where: { userId, readAt: null } });
  }
}

export async function clearNotifications(userId: string) {
  await SystemNotification.destroy({ where: { userId } });
}

export async function activeTakeoverClassIdsForTeacher(userId: string) {
  const teacher = await teacherForUser(userId);
  if (!teacher) return [];
  const leaves = await TeacherLeaveRequest.findAll({ where: { teacherId: teacher.id, status: "ACTIVE_LEAVE" } });
  const ids = leaves.map((item) => item.id);
  if (!ids.length) return [];
  const takeovers = await ClassTakeover.findAll({ where: { leaveRequestId: { [Op.in]: ids }, status: "ACTIVE" } });
  const activeLeaveIds = takeovers.map((item) => item.leaveRequestId);
  if (!activeLeaveIds.length) return [];
  const classes = await LeaveAffectedClass.findAll({ where: { leaveRequestId: { [Op.in]: activeLeaveIds } } });
  return classes.map((item) => Number(item.classId));
}

async function activeWorkspace(leaveId: string) {
  const leave = await TeacherLeaveRequest.findByPk(leaveId);
  if (!leave || leave.status !== "ACTIVE_LEAVE") return null;
  const [takeover, teacher, classes] = await Promise.all([
    ClassTakeover.findOne({
      where: { leaveRequestId: leave.id, status: "ACTIVE" },
    }),
    Teacher.findByPk(leave.teacherId),
    LeaveAffectedClass.findAll({
      where: { leaveRequestId: leave.id },
      order: [["id", "ASC"]],
    }),
  ]);
  return takeover && teacher ? { leave, takeover, teacher, classes } : null;
}

async function recordWorkspaceActivity(
  context: RequestContext,
  workspace: NonNullable<Awaited<ReturnType<typeof activeWorkspace>>>,
  action: string,
  classId: number | null,
  previousValue: unknown,
  newValue: unknown,
  details: string,
) {
  await TakeoverActivity.create({
    takeoverId: workspace.takeover.id,
    classId,
    userId: Number(context.user.sub),
    action,
    previousValue,
    newValue,
    details,
  });
  await audit(
    context,
    action,
    workspace.leave,
    classId ? [classId] : workspace.classes.map((item) => item.classId),
    { details },
  );
}

export async function getTakeoverWorkspace(leaveId: string, date?: string) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return null;
  const classIds = new Set(workspace.classes.map((item) => Number(item.classId)));
  const [attendance, assignments, studentPairs] = await Promise.all([
    listAttendanceForTeacher(
      String(workspace.teacher.userId),
      date ? { date } : undefined,
    ),
    listAssignmentsForTeacher(String(workspace.teacher.userId)),
    Promise.all(
      workspace.classes.map(async (item) => ({
        classId: Number(item.classId),
        students:
          (await listStudentsForTeacherClass(
            String(workspace.teacher.userId),
            String(item.classId),
          )) || [],
      })),
    ),
  ]);
  return {
    leave: await serializeLeave(workspace.leave),
    classes: workspace.classes,
    studentsByClass: Object.fromEntries(
      studentPairs.map((item) => [item.classId, item.students]),
    ),
    attendance: (attendance ?? []).filter((item) =>
      classIds.has(Number(item.classId)),
    ),
    assignments: (assignments ?? []).filter((item) =>
      classIds.has(Number(item.classId)),
    ),
  };
}

export async function recordTakeoverWorkspaceAccess(
  context: RequestContext,
  leaveId: string,
  tool?: string,
) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return;
  await recordWorkspaceActivity(
    context,
    workspace,
    "CLASS_ACCESS",
    null,
    null,
    { tool: tool || "workspace" },
    `Super Admin opened the ${tool || "takeover"} workspace.`,
  );
}

export async function saveTakeoverAttendance(
  context: RequestContext,
  leaveId: string,
  input: Record<string, unknown>,
) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return { error: "Active takeover not found", status: 404 };
  const date = dateOnly(input.date);
  const allowed = new Set(workspace.classes.map((item) => Number(item.classId)));
  const records = (Array.isArray(input.records) ? input.records : []).filter(
    (record: { classId?: unknown }) => allowed.has(Number(record.classId)),
  ) as Array<{
    classId: number;
    studentId: number;
    status: "present" | "late" | "absent";
  }>;
  if (!date || !records.length)
    return { error: "Date and attendance records are required", status: 400 };
  const previousAttendance = (
    (await listAttendanceForTeacher(String(workspace.teacher.userId), {
      date,
    })) ?? []
  ).filter((item) =>
    records.some(
      (record) =>
        Number(record.classId) === Number(item.classId) &&
        Number(record.studentId) === Number(item.studentId),
    ),
  );
  const saved = await saveAttendanceForTeacher(
    String(workspace.teacher.userId),
    { date, records },
  );
  await recordWorkspaceActivity(
    context,
    workspace,
    "ATTENDANCE_UPDATED",
    records[0]?.classId ?? null,
    previousAttendance,
    { date, records },
    `${saved ?? 0} attendance records saved by the Super Admin.`,
  );
  return { saved };
}

export async function createTakeoverAssignment(
  context: RequestContext,
  leaveId: string,
  input: Record<string, unknown>,
) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return { error: "Active takeover not found", status: 404 };
  const classId = Number(input.classId);
  if (!workspace.classes.some((item) => Number(item.classId) === classId))
    return { error: "Class is outside this takeover", status: 403 };
  const assignment = await createAssignmentForTeacher(
    String(workspace.teacher.userId),
    {
      classId,
      title: String(input.title ?? ""),
      description: String(input.description ?? ""),
      dueDate: String(input.dueDate ?? ""),
      status: "Active",
    },
  );
  if (!assignment || assignment === "past_date")
    return {
      error:
        assignment === "past_date"
          ? "Assignment due date cannot be in the past"
          : "Invalid assignment",
      status: 400,
    };
  await recordWorkspaceActivity(
    context,
    workspace,
    "ASSIGNMENT_CREATED",
    classId,
    null,
    assignment.toJSON(),
    `Assignment "${assignment.title}" created by the Super Admin.`,
  );
  return { assignment };
}

export async function getTakeoverGrades(
  leaveId: string,
  filter: {
    section?: string;
    gradeLevel?: string;
    subject?: string;
    term?: string;
  },
) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return null;
  return getPublishedGradesForTeacher(
    String(workspace.teacher.userId),
    filter,
  );
}

export async function saveTakeoverGrades(
  context: RequestContext,
  leaveId: string,
  input: {
    section: string;
    gradeLevel: string;
    subject: string;
    term: string;
    publish: boolean;
    rows: Array<{ studentId: number; score: number }>;
  },
) {
  const workspace = await activeWorkspace(leaveId);
  if (!workspace) return { error: "Active takeover not found", status: 404 };
  const matchingClass = workspace.classes.find(
    (item) =>
      String(item.subjectName ?? "").toLowerCase() ===
        String(input.subject ?? "").toLowerCase() &&
      String(item.gradeLevel ?? "").toLowerCase() ===
        String(input.gradeLevel ?? "").toLowerCase() &&
      String(item.sectionName ?? "").toLowerCase() ===
        String(input.section ?? "").toLowerCase(),
  );
  if (!matchingClass)
    return { error: "Class is outside this takeover", status: 403 };
  const previousGrades = await getPublishedGradesForTeacher(
    String(workspace.teacher.userId),
    {
      section: input.section,
      gradeLevel: input.gradeLevel,
      subject: input.subject,
      term: input.term,
    },
  );
  const saved = await savePublishedGradesForTeacher(
    String(workspace.teacher.userId),
    input,
  );
  if (saved === false || saved === null)
    return { error: "Grades could not be saved", status: 400 };
  if (typeof saved === "object") return saved;
  await recordWorkspaceActivity(
    context,
    workspace,
    "GRADES_UPDATED",
    Number(matchingClass.classId),
    previousGrades,
    { term: input.term, rows: input.rows, published: input.publish },
    `${saved} grades updated by the Super Admin.`,
  );
  return { saved };
}
