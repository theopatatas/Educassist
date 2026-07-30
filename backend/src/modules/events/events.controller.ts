import type { Request, Response } from "express";
import {
  createEvent,
  deleteEvent,
  type EventAudienceContext,
  listEvents,
  normalizeEventDate,
  updateEvent,
} from "./events.service";
import { Attendance } from "../../db/models/Attendance.model";
import { Student } from "../../db/models/Student.model";
import { Section } from "../../db/models/Section.model";
import { SchoolEvent } from "../../db/models/SchoolEvent.model";
import { Op, fn, col } from "sequelize";
import { EventNotificationRead } from "../../db/models/EventNotificationRead.model";
import { getParentSelectedStudentByUserId } from "../parent/parent.service";
import { Teacher } from "../../db/models/Teacher.model";
import { Class } from "../../db/models/Class.model";
import { Enrollment } from "../../db/models/Enrollment.model";
import { normalizeAcademicTerm } from "../../utils/academic-terms";

const categories = new Set([
  "Meeting",
  "Holiday",
  "School Activity",
  "Deadlines",
  "Grade Encoding Deadline",
  "Terms",
  "Exams",
]);
function body(req: Request) {
  const eventDate = String(req.body?.eventDate ?? "").trim();
  const submittedCategory = String(req.body?.category ?? "").trim();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return {
    title: String(req.body?.title ?? "").trim(),
    category: submittedCategory === "Quarters" ? "Terms" : submittedCategory,
    description: String(req.body?.description ?? "").trim() || null,
    eventDate,
    endDate: String(req.body?.endDate ?? "").trim() || null,
    startTime: String(req.body?.startTime ?? "").trim() || null,
    endTime: String(req.body?.endTime ?? "").trim() || null,
    location: String(req.body?.location ?? "").trim() || null,
    targetAudience: String(req.body?.targetAudience ?? "").trim(),
    status:
      (String(req.body?.endDate ?? "").trim() || eventDate) < today
        ? "Completed"
        : "Scheduled",
  };
}
function validate(
  value: ReturnType<typeof body>,
  restrictSpecialCharacters = false,
) {
  if (
    !value.title ||
    !categories.has(value.category) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate) ||
    !value.targetAudience
  )
    return "Title, valid category, date, and target audience are required";
  if (restrictSpecialCharacters) {
    const safeText = /^[A-Za-z0-9 ]+$/;
    const safeMultilineText = /^[A-Za-z0-9 \n.,?!'":;()\-]*$/;
    if (!safeText.test(value.title))
      return "Event title may contain letters, numbers, and spaces only";
    if (value.location && !safeText.test(value.location))
      return "Location may contain letters, numbers, and spaces only";
    if (value.description && !safeMultilineText.test(value.description))
      return "Description may contain letters, numbers, spaces, common sentence punctuation, and line breaks only";
  }
  if (value.endDate && value.endDate < value.eventDate)
    return "End date must be on or after the start date";
  if (value.startTime && value.endTime && value.endTime <= value.startTime)
    return "End time must be after start time";
  return null;
}

async function eventAudienceContext(req: Request): Promise<{
  context?: EventAudienceContext;
  forbidden?: boolean;
}> {
  const role = String(req.user?.role ?? "");
  const userId = Number(req.user?.sub);
  if (role === "parent" && req.user?.sub) {
    const selected = await getParentSelectedStudentByUserId(
      String(req.user.sub),
      typeof req.query.studentId === "string" ? req.query.studentId : undefined,
    );
    if (selected && "forbidden" in selected) return { forbidden: true };
    const student = selected?.student;
    const enrollments = student
      ? await Enrollment.findAll({
          where: { studentId: student.id },
          attributes: ["classId"],
        })
      : [];
    return {
      context: student
        ? {
            userId,
            gradeLevels: [student.gradeLevel],
            sectionIds: [student.sectionId],
            sectionNames: [student.sectionName],
            classIds: enrollments.map((row) => Number(row.classId)),
          }
        : { userId },
    };
  }
  if (role === "student") {
    const student = await Student.findOne({ where: { userId } });
    const section = student?.sectionId
      ? await Section.findByPk(student.sectionId, {
          attributes: ["id", "name"],
        })
      : null;
    const enrollments = student
      ? await Enrollment.findAll({
          where: { studentId: student.id },
          attributes: ["classId"],
        })
      : [];
    return {
      context: {
        userId,
        gradeLevels: [student?.yearLevel ?? null],
        sectionIds: [student?.sectionId ?? null],
        sectionNames: [section?.name ?? null],
        classIds: enrollments.map((row) => Number(row.classId)),
      },
    };
  }
  if (role === "teacher") {
    const teacher = await Teacher.findOne({ where: { userId } });
    const classes = teacher
      ? await Class.findAll({ where: { teacherId: teacher.id } })
      : [];
    const sectionIds = [
      teacher?.sectionId ?? null,
      ...classes.map((row) => row.sectionId),
    ];
    const sections = sectionIds.some(Boolean)
      ? await Section.findAll({
          where: { id: sectionIds.filter(Boolean) as number[] },
          attributes: ["id", "name"],
        })
      : [];
    return {
      context: {
        userId,
        gradeLevels: [
          teacher?.gradeLevel ?? null,
          ...classes.map((row) => row.gradeLevel),
        ],
        sectionIds,
        sectionNames: sections.map((row) => row.name),
        classIds: classes.map((row) => Number(row.id)),
      },
    };
  }
  return { context: { userId } };
}

export async function list(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  const role = String(req.user?.role ?? "");
  const resolvedAudience = await eventAudienceContext(req);
  if (resolvedAudience.forbidden)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  return res.json({
    ok: true,
    events: await listEvents(req.query, role, resolvedAudience.context),
  });
}
export async function create(req: Request, res: Response) {
  const value = body(req);
  const role = String(
    (req as Request & { user?: { role?: string } }).user?.role ?? "",
  );
  const error = validate(value, role === "admin");
  if (error) return res.status(400).json({ ok: false, message: error });
  const userId = Number(
    (req as Request & { user?: { sub?: string } }).user?.sub,
  );
  const created = await createEvent(value, userId);
  const event = (await listEvents({})).find(
    (item) => Number(item.id) === Number(created.id),
  );
  if (!event)
    return res
      .status(500)
      .json({ ok: false, message: "Created event could not be loaded" });
  return res.status(201).json({ ok: true, event });
}
export async function update(req: Request, res: Response) {
  const value = body(req);
  const role = String(
    (req as Request & { user?: { role?: string } }).user?.role ?? "",
  );
  const error = validate(value, role === "admin");
  if (error) return res.status(400).json({ ok: false, message: error });
  const updated = await updateEvent(req.params.id, value);
  if (!updated)
    return res.status(404).json({ ok: false, message: "Event not found" });
  const event = (await listEvents({})).find(
    (item) => Number(item.id) === Number(updated.id),
  );
  if (!event)
    return res
      .status(500)
      .json({ ok: false, message: "Updated event could not be loaded" });
  return res.json({ ok: true, event });
}
export async function remove(req: Request, res: Response) {
  return (await deleteEvent(req.params.id))
    ? res.json({ ok: true })
    : res.status(404).json({ ok: false, message: "Event not found" });
}

export async function dashboard(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  const today = normalizeEventDate(new Date())!;
  const monthEnd = `${today.slice(0, 7)}-31`;
  const [
    students,
    activeStudents,
    attendanceRows,
    upcomingEvents,
    calendarEvents,
    gradeRows,
    sectionRows,
  ] = await Promise.all([
    Student.count({ where: { archivedAt: null } }),
    Student.count({ where: { archivedAt: null, graduatedAt: null } }),
    Attendance.findAll({
      where: { date: today },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    }),
    SchoolEvent.findAll({
      where: {
        [Op.or]: [
          { eventDate: { [Op.gte]: today } },
          { endDate: { [Op.gte]: today } },
        ],
      },
      order: [
        ["eventDate", "ASC"],
        ["startTime", "ASC"],
      ],
      limit: 8,
    }),
    listEvents({}),
    Student.findAll({
      where: { archivedAt: null },
      attributes: ["yearLevel", [fn("COUNT", col("id")), "count"]],
      group: ["yearLevel"],
      raw: true,
    }),
    Student.findAll({
      where: { archivedAt: null },
      attributes: ["sectionId", [fn("COUNT", col("id")), "count"]],
      group: ["sectionId"],
      raw: true,
    }),
  ]);
  const attendance = { present: 0, late: 0, absent: 0 };
  for (const row of attendanceRows as unknown as Array<{
    status: string;
    count: string;
  }>) {
    const key = row.status.toLowerCase() as keyof typeof attendance;
    if (key in attendance) attendance[key] = Number(row.count);
  }
  const totalAttendance =
    attendance.present + attendance.late + attendance.absent;
  const sectionIds = sectionRows
    .map((row) => Number((row as unknown as { sectionId: number }).sectionId))
    .filter(Boolean);
  const sections = await Section.findAll({
    where: { id: sectionIds },
    attributes: ["id", "name"],
  });
  const sectionNames = new Map(
    sections.map((section) => [Number(section.id), section.name]),
  );
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthlyEvents = calendarEvents.filter(
    (event) =>
      event.eventDate <= monthEnd &&
      (event.endDate || event.eventDate) >= monthStart,
  );
  return res.json({
    ok: true,
    overview: {
      students,
      activeStudents,
      attendance: {
        ...attendance,
        rate: totalAttendance
          ? Math.round((attendance.present / totalAttendance) * 100)
          : null,
      },
      upcomingMeetings: upcomingEvents.filter(
        (event) => event.category === "Meeting",
      ).length,
      holidaysThisMonth: monthlyEvents.filter(
        (event) => event.category === "Holiday",
      ).length,
      schoolActivities: monthlyEvents.filter(
        (event) => event.category === "School Activity",
      ).length,
      studentsByGrade: gradeRows
        .map((row) => ({
          label: (row as unknown as { yearLevel: string | null }).yearLevel,
          count: Number((row as unknown as { count: string }).count),
        }))
        .filter((row) => row.label),
      studentsBySection: sectionRows
        .map((row) => ({
          label:
            sectionNames.get(
              Number((row as unknown as { sectionId: number }).sectionId),
            ) ?? null,
          count: Number((row as unknown as { count: string }).count),
        }))
        .filter((row) => row.label),
      upcomingEvents,
      calendarEvents,
    },
  });
}

function currentUserId(req: Request) {
  return Number((req as Request & { user?: { sub?: string } }).user?.sub);
}

function gradeEncodingNotificationTitle(
  eventTitle: string,
  description?: string | null,
) {
  const activeTerm = eventTitle.includes("End of School Year")
    ? "End of School Year"
    : normalizeAcademicTerm(eventTitle);
  const encodedTerm = normalizeAcademicTerm(
    description?.match(/Encoding (?:term|quarter): ([^.]*)/i)?.[1] ?? "",
  );
  const openTerm = encodedTerm || normalizeAcademicTerm(activeTerm);
  if (activeTerm === "End of School Year" && openTerm === "Term 3")
    return "Principal set End of School Year Grade Encoding Deadline for Term 3 has started";
  return openTerm
    ? `Principal created ${openTerm} Grade Encoding Deadline`
    : `Principal created ${eventTitle}`;
}

export async function notifications(req: Request, res: Response) {
  const userId = currentUserId(req);
  const role = String(req.user?.role ?? "");
  const resolvedAudience = await eventAudienceContext(req);
  if (resolvedAudience.forbidden)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  const events = (await listEvents({}, role, resolvedAudience.context))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 30);
  const eventIds = events.map((event) => Number(event.id));
  const reads = await EventNotificationRead.findAll({
    where: { userId, eventId: eventIds },
    attributes: ["eventId", "dismissedAt"],
  });
  const readIds = new Set(reads.map((read) => Number(read.eventId)));
  const dismissedIds = new Set(
    reads
      .filter((read) => Boolean(read.dismissedAt))
      .map((read) => Number(read.eventId)),
  );
  return res.json({
    ok: true,
    notifications: events
      .filter((event) => Number(event.createdBy) !== userId)
      .filter((event) => !dismissedIds.has(Number(event.id)))
      .map((event) => ({
        id: Number(event.id),
        title:
          event.category === "Grade Encoding Deadline"
            ? gradeEncodingNotificationTitle(event.title, event.description)
            : `${event.creator?.name ?? "An administrator"} created ${event.title}`,
        category: event.category,
        occurredAt:
          event.category === "Grade Encoding Deadline"
            ? event.updatedAt
            : event.createdAt,
        read: readIds.has(Number(event.id)),
        event,
      })),
  });
}
export async function readNotification(req: Request, res: Response) {
  await EventNotificationRead.findOrCreate({
    where: { eventId: Number(req.params.id), userId: currentUserId(req) },
  });
  return res.json({ ok: true });
}
export async function readAllNotifications(req: Request, res: Response) {
  const userId = currentUserId(req);
  const events = await SchoolEvent.findAll({
    where: { createdBy: { [Op.ne]: userId } },
    attributes: ["id"],
  });
  await Promise.all(
    events.map((event) =>
      EventNotificationRead.findOrCreate({
        where: { eventId: event.id, userId },
      }),
    ),
  );
  return res.json({ ok: true });
}
export async function clearAllNotifications(req: Request, res: Response) {
  const userId = currentUserId(req);
  const events = await SchoolEvent.findAll({
    where: { createdBy: { [Op.ne]: userId } },
    attributes: ["id"],
  });
  await Promise.all(
    events.map(async (event) => {
      const [read] = await EventNotificationRead.findOrCreate({
        where: { eventId: event.id, userId },
      });
      await read.update({ dismissedAt: new Date() });
    }),
  );
  return res.json({ ok: true });
}
