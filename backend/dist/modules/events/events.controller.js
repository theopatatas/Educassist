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
exports.clearAllNotifications = clearAllNotifications;
const events_service_1 = require("./events.service");
const Attendance_model_1 = require("../../db/models/Attendance.model");
const Student_model_1 = require("../../db/models/Student.model");
const Section_model_1 = require("../../db/models/Section.model");
const SchoolEvent_model_1 = require("../../db/models/SchoolEvent.model");
const sequelize_1 = require("sequelize");
const EventNotificationRead_model_1 = require("../../db/models/EventNotificationRead.model");
const parent_service_1 = require("../parent/parent.service");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const Class_model_1 = require("../../db/models/Class.model");
const Enrollment_model_1 = require("../../db/models/Enrollment.model");
const academic_terms_1 = require("../../utils/academic-terms");
const categories = new Set([
    "Meeting",
    "Holiday",
    "School Activity",
    "Deadlines",
    "Grade Encoding Deadline",
    "Terms",
    "Exams",
]);
function body(req) {
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
async function eventAudienceContext(req) {
    const role = String(req.user?.role ?? "");
    const userId = Number(req.user?.sub);
    if (role === "parent" && req.user?.sub) {
        const selected = await (0, parent_service_1.getParentSelectedStudentByUserId)(String(req.user.sub), typeof req.query.studentId === "string" ? req.query.studentId : undefined);
        if (selected && "forbidden" in selected)
            return { forbidden: true };
        const student = selected?.student;
        const enrollments = student
            ? await Enrollment_model_1.Enrollment.findAll({
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
        const student = await Student_model_1.Student.findOne({ where: { userId } });
        const section = student?.sectionId
            ? await Section_model_1.Section.findByPk(student.sectionId, {
                attributes: ["id", "name"],
            })
            : null;
        const enrollments = student
            ? await Enrollment_model_1.Enrollment.findAll({
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
        const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
        const classes = teacher
            ? await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } })
            : [];
        const sectionIds = [
            teacher?.sectionId ?? null,
            ...classes.map((row) => row.sectionId),
        ];
        const sections = sectionIds.some(Boolean)
            ? await Section_model_1.Section.findAll({
                where: { id: sectionIds.filter(Boolean) },
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
async function list(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    const role = String(req.user?.role ?? "");
    const resolvedAudience = await eventAudienceContext(req);
    if (resolvedAudience.forbidden)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    return res.json({
        ok: true,
        events: await (0, events_service_1.listEvents)(req.query, role, resolvedAudience.context),
    });
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
    if (!event)
        return res
            .status(500)
            .json({ ok: false, message: "Created event could not be loaded" });
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
    if (!event)
        return res
            .status(500)
            .json({ ok: false, message: "Updated event could not be loaded" });
    return res.json({ ok: true, event });
}
async function remove(req, res) {
    return (await (0, events_service_1.deleteEvent)(req.params.id))
        ? res.json({ ok: true })
        : res.status(404).json({ ok: false, message: "Event not found" });
}
async function dashboard(_req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    const today = (0, events_service_1.normalizeEventDate)(new Date());
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
function gradeEncodingNotificationTitle(eventTitle, description) {
    const activeTerm = eventTitle.includes("End of School Year")
        ? "End of School Year"
        : (0, academic_terms_1.normalizeAcademicTerm)(eventTitle);
    const encodedTerm = (0, academic_terms_1.normalizeAcademicTerm)(description?.match(/Encoding (?:term|quarter): ([^.]*)/i)?.[1] ?? "");
    const openTerm = encodedTerm || (0, academic_terms_1.normalizeAcademicTerm)(activeTerm);
    if (activeTerm === "End of School Year" && openTerm === "Term 3")
        return "Principal set End of School Year Grade Encoding Deadline for Term 3 has started";
    return openTerm
        ? `Principal created ${openTerm} Grade Encoding Deadline`
        : `Principal created ${eventTitle}`;
}
async function notifications(req, res) {
    const userId = currentUserId(req);
    const role = String(req.user?.role ?? "");
    const resolvedAudience = await eventAudienceContext(req);
    if (resolvedAudience.forbidden)
        return res
            .status(403)
            .json({ ok: false, message: "Student is not linked to this parent" });
    const events = (await (0, events_service_1.listEvents)({}, role, resolvedAudience.context))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 30);
    const eventIds = events.map((event) => Number(event.id));
    const reads = await EventNotificationRead_model_1.EventNotificationRead.findAll({
        where: { userId, eventId: eventIds },
        attributes: ["eventId", "dismissedAt"],
    });
    const readIds = new Set(reads.map((read) => Number(read.eventId)));
    const dismissedIds = new Set(reads
        .filter((read) => Boolean(read.dismissedAt))
        .map((read) => Number(read.eventId)));
    return res.json({
        ok: true,
        notifications: events
            .filter((event) => Number(event.createdBy) !== userId)
            .filter((event) => !dismissedIds.has(Number(event.id)))
            .map((event) => ({
            id: Number(event.id),
            title: event.category === "Grade Encoding Deadline"
                ? gradeEncodingNotificationTitle(event.title, event.description)
                : `${event.creator?.name ?? "An administrator"} created ${event.title}`,
            category: event.category,
            occurredAt: event.category === "Grade Encoding Deadline"
                ? event.updatedAt
                : event.createdAt,
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
async function clearAllNotifications(req, res) {
    const userId = currentUserId(req);
    const events = await SchoolEvent_model_1.SchoolEvent.findAll({
        where: { createdBy: { [sequelize_1.Op.ne]: userId } },
        attributes: ["id"],
    });
    await Promise.all(events.map(async (event) => {
        const [read] = await EventNotificationRead_model_1.EventNotificationRead.findOrCreate({
            where: { eventId: event.id, userId },
        });
        await read.update({ dismissedAt: new Date() });
    }));
    return res.json({ ok: true });
}
