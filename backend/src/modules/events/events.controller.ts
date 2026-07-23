import type { Request, Response } from "express";
import {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
} from "./events.service";
import { Attendance } from "../../db/models/Attendance.model";
import { Student } from "../../db/models/Student.model";
import { Section } from "../../db/models/Section.model";
import { SchoolEvent } from "../../db/models/SchoolEvent.model";
import { Op, fn, col } from "sequelize";
import { EventNotificationRead } from "../../db/models/EventNotificationRead.model";

const categories = new Set([
  "Meeting",
  "Holiday",
  "School Activity",
  "Deadlines",
  "Grade Encoding Deadline",
  "Quarters",
  "Exams",
]);
function body(req: Request) {
  const eventDate = String(req.body?.eventDate ?? "").trim();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return {
    title: String(req.body?.title ?? "").trim(),
    category: String(req.body?.category ?? "").trim(),
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
export async function list(req: Request, res: Response) {
  return res.json({ ok: true, events: await listEvents(req.query) });
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
  return res.json({ ok: true, event });
}
export async function remove(req: Request, res: Response) {
  return (await deleteEvent(req.params.id))
    ? res.json({ ok: true })
    : res.status(404).json({ ok: false, message: "Event not found" });
}

export async function dashboard(_req: Request, res: Response) {
  const today = new Date().toISOString().slice(0, 10);
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
export async function notifications(req: Request, res: Response) {
  const userId = currentUserId(req);
  const events = (await listEvents({}))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 30);
  const eventIds = events.map((event) => Number(event.id));
  const reads = await EventNotificationRead.findAll({
    where: { userId, eventId: eventIds },
    attributes: ["eventId"],
  });
  const readIds = new Set(reads.map((read) => Number(read.eventId)));
  return res.json({
    ok: true,
    notifications: events
      .filter((event) => Number(event.createdBy) !== userId)
      .map((event) => ({
        id: Number(event.id),
        title: `${event.creator?.name ?? "An administrator"} created ${event.title}`,
        category: event.category,
        occurredAt: event.createdAt,
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
