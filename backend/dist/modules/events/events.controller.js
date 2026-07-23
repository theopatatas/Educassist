"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.dashboard = dashboard;
exports.notifications = notifications;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
const events_service_1 = require("./events.service");
const Attendance_model_1 = require("../../db/models/Attendance.model");
const Student_model_1 = require("../../db/models/Student.model");
const Section_model_1 = require("../../db/models/Section.model");
const SchoolEvent_model_1 = require("../../db/models/SchoolEvent.model");
const sequelize_1 = require("sequelize");
const EventNotificationRead_model_1 = require("../../db/models/EventNotificationRead.model");
const categories = new Set([
    "Meeting",
    "Holiday",
    "School Activity",
    "Deadlines",
    "Grade Encoding Deadline",
    "Quarters",
    "Exams",
]);
function body(req) {
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
        status: (String(req.body?.endDate ?? "").trim() || eventDate) < today
            ? "Completed"
            : "Scheduled",
    };
}
function validate(value, restrictSpecialCharacters = false) {
    if (!value.title ||
        !categories.has(value.category) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate) ||
        !value.targetAudience)
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
async function list(req, res) {
    return res.json({ ok: true, events: await (0, events_service_1.listEvents)(req.query) });
}
async function create(req, res) {
    const value = body(req);
    const role = String(req.user?.role ?? "");
    const error = validate(value, role === "admin");
    if (error)
        return res.status(400).json({ ok: false, message: error });
    const userId = Number(req.user?.sub);
    const created = await (0, events_service_1.createEvent)(value, userId);
    const event = (await (0, events_service_1.listEvents)({})).find((item) => Number(item.id) === Number(created.id));
    return res.status(201).json({ ok: true, event });
}
async function update(req, res) {
    const value = body(req);
    const role = String(req.user?.role ?? "");
    const error = validate(value, role === "admin");
    if (error)
        return res.status(400).json({ ok: false, message: error });
    const updated = await (0, events_service_1.updateEvent)(req.params.id, value);
    if (!updated)
        return res.status(404).json({ ok: false, message: "Event not found" });
    const event = (await (0, events_service_1.listEvents)({})).find((item) => Number(item.id) === Number(updated.id));
    return res.json({ ok: true, event });
}
async function remove(req, res) {
    return (await (0, events_service_1.deleteEvent)(req.params.id))
        ? res.json({ ok: true })
        : res.status(404).json({ ok: false, message: "Event not found" });
}
async function dashboard(_req, res) {
    const today = new Date().toISOString().slice(0, 10);
    const monthEnd = `${today.slice(0, 7)}-31`;
    const [students, activeStudents, attendanceRows, upcomingEvents, calendarEvents, gradeRows, sectionRows,] = await Promise.all([
        Student_model_1.Student.count({ where: { archivedAt: null } }),
        Student_model_1.Student.count({ where: { archivedAt: null, graduatedAt: null } }),
        Attendance_model_1.Attendance.findAll({
            where: { date: today },
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["status"],
            raw: true,
        }),
        SchoolEvent_model_1.SchoolEvent.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { eventDate: { [sequelize_1.Op.gte]: today } },
                    { endDate: { [sequelize_1.Op.gte]: today } },
                ],
            },
            order: [
                ["eventDate", "ASC"],
                ["startTime", "ASC"],
            ],
            limit: 8,
        }),
        (0, events_service_1.listEvents)({}),
        Student_model_1.Student.findAll({
            where: { archivedAt: null },
            attributes: ["yearLevel", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["yearLevel"],
            raw: true,
        }),
        Student_model_1.Student.findAll({
            where: { archivedAt: null },
            attributes: ["sectionId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["sectionId"],
            raw: true,
        }),
    ]);
    const attendance = { present: 0, late: 0, absent: 0 };
    for (const row of attendanceRows) {
        const key = row.status.toLowerCase();
        if (key in attendance)
            attendance[key] = Number(row.count);
    }
    const totalAttendance = attendance.present + attendance.late + attendance.absent;
    const sectionIds = sectionRows
        .map((row) => Number(row.sectionId))
        .filter(Boolean);
    const sections = await Section_model_1.Section.findAll({
        where: { id: sectionIds },
        attributes: ["id", "name"],
    });
    const sectionNames = new Map(sections.map((section) => [Number(section.id), section.name]));
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthlyEvents = calendarEvents.filter((event) => event.eventDate <= monthEnd &&
        (event.endDate || event.eventDate) >= monthStart);
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
            upcomingMeetings: upcomingEvents.filter((event) => event.category === "Meeting").length,
            holidaysThisMonth: monthlyEvents.filter((event) => event.category === "Holiday").length,
            schoolActivities: monthlyEvents.filter((event) => event.category === "School Activity").length,
            studentsByGrade: gradeRows
                .map((row) => ({
                label: row.yearLevel,
                count: Number(row.count),
            }))
                .filter((row) => row.label),
            studentsBySection: sectionRows
                .map((row) => ({
                label: sectionNames.get(Number(row.sectionId)) ?? null,
                count: Number(row.count),
            }))
                .filter((row) => row.label),
            upcomingEvents,
            calendarEvents,
        },
    });
}
function currentUserId(req) {
    return Number(req.user?.sub);
}
async function notifications(req, res) {
    const userId = currentUserId(req);
    const events = (await (0, events_service_1.listEvents)({}))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 30);
    const eventIds = events.map((event) => Number(event.id));
    const reads = await EventNotificationRead_model_1.EventNotificationRead.findAll({
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
async function readNotification(req, res) {
    await EventNotificationRead_model_1.EventNotificationRead.findOrCreate({
        where: { eventId: Number(req.params.id), userId: currentUserId(req) },
    });
    return res.json({ ok: true });
}
async function readAllNotifications(req, res) {
    const userId = currentUserId(req);
    const events = await SchoolEvent_model_1.SchoolEvent.findAll({
        where: { createdBy: { [sequelize_1.Op.ne]: userId } },
        attributes: ["id"],
    });
    await Promise.all(events.map((event) => EventNotificationRead_model_1.EventNotificationRead.findOrCreate({
        where: { eventId: event.id, userId },
    })));
    return res.json({ ok: true });
}
