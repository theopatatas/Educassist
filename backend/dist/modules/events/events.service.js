"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = void 0;
exports.normalizeEventDate = normalizeEventDate;
exports.listEvents = listEvents;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const sequelize_1 = require("sequelize");
const SchoolEvent_model_1 = require("../../db/models/SchoolEvent.model");
const User_model_1 = require("../../db/models/User.model");
const academic_terms_1 = require("../../utils/academic-terms");
function normalizeEventDate(value) {
    if (!value)
        return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
}
async function listEvents(query, audienceRole, audienceContext) {
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    const statusRows = await SchoolEvent_model_1.SchoolEvent.findAll({
        attributes: ["id", "eventDate", "endDate", "status"],
    });
    await Promise.all(statusRows.map((event) => {
        const eventDate = normalizeEventDate(event.eventDate) ?? "";
        const endDate = normalizeEventDate(event.endDate);
        const expected = (endDate || eventDate) < today ? "Completed" : "Scheduled";
        return event.status === expected
            ? Promise.resolve(event)
            : event.update({ status: expected });
    }));
    const where = {};
    if (query.category)
        where.category = String(query.category);
    if (query.status)
        where.status = String(query.status);
    if (query.dateFrom || query.dateTo) {
        where.eventDate = {
            ...(query.dateFrom ? { [sequelize_1.Op.gte]: String(query.dateFrom) } : {}),
            ...(query.dateTo ? { [sequelize_1.Op.lte]: String(query.dateTo) } : {}),
        };
    }
    if (query.search) {
        const search = `%${String(query.search).trim()}%`;
        where[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.like]: search } },
            { category: { [sequelize_1.Op.like]: search } },
        ];
    }
    const events = await SchoolEvent_model_1.SchoolEvent.findAll({
        where,
        order: [
            ["eventDate", "ASC"],
            ["startTime", "ASC"],
        ],
    });
    const creatorIds = [...new Set(events.map((event) => event.createdBy))];
    const creators = await User_model_1.User.findAll({
        where: { id: creatorIds },
        attributes: [
            "id",
            "role",
            "firstName",
            "lastName",
            "displayName",
            "email",
        ],
    });
    const byId = new Map(creators.map((user) => [String(user.id), user]));
    return events.map((event) => {
        const row = event.toJSON();
        const creator = byId.get(String(event.createdBy));
        return {
            ...row,
            category: event.category === "Quarters" ? "Terms" : event.category,
            title: (0, academic_terms_1.normalizeAcademicPeriodText)(event.title),
            description: event.description
                ? (0, academic_terms_1.normalizeAcademicPeriodText)(event.description)
                : null,
            eventDate: normalizeEventDate(event.eventDate) ?? "",
            endDate: normalizeEventDate(event.endDate),
            creator: creator
                ? {
                    id: Number(creator.id),
                    name: event.category === "Grade Encoding Deadline" &&
                        ["admin", "super_admin"].includes(String(creator.role).toLowerCase())
                        ? "Principal"
                        : creator.displayName ||
                            [creator.firstName, creator.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                            creator.email,
                }
                : null,
        };
    }).filter((event) => {
        if (!audienceRole || ["admin", "managed_admin"].includes(audienceRole))
            return true;
        const audience = event.targetAudience.trim().toLowerCase();
        if (audience === "all users")
            return true;
        if (audienceRole === "teacher" && audience === "all teachers")
            return true;
        if (audienceRole === "student" && audience === "all students")
            return true;
        if (audienceRole === "parent" && audience === "all parents")
            return true;
        const valuesAfter = (prefix) => audience.startsWith(`${prefix}:`)
            ? audience
                .slice(prefix.length + 1)
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
        const gradeLevels = (audienceContext?.gradeLevels ?? [])
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
        const sectionIds = (audienceContext?.sectionIds ?? [])
            .filter(Boolean)
            .map(String);
        const sectionNames = (audienceContext?.sectionNames ?? [])
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
        const classIds = (audienceContext?.classIds ?? [])
            .filter(Boolean)
            .map(String);
        if (audience === "grade level")
            return gradeLevels.length > 0;
        if (audience.startsWith("grade level:"))
            return valuesAfter("grade level").some((value) => gradeLevels.includes(value));
        if (audience === "section")
            return sectionIds.length > 0 || sectionNames.length > 0;
        if (audience.startsWith("section:"))
            return valuesAfter("section").some((value) => sectionIds.includes(value) || sectionNames.includes(value));
        if (audience === "specific class")
            return classIds.length > 0;
        if (audience.startsWith("specific class:"))
            return valuesAfter("specific class").some((value) => classIds.includes(value));
        if (audience.startsWith("specific users:") ||
            audience.startsWith("specific user:")) {
            const prefix = audience.startsWith("specific users")
                ? "specific users"
                : "specific user";
            return valuesAfter(prefix).includes(String(audienceContext?.userId ?? ""));
        }
        return false;
    });
}
const createEvent = (input, createdBy) => SchoolEvent_model_1.SchoolEvent.create({ ...input, createdBy });
exports.createEvent = createEvent;
async function updateEvent(id, input) {
    const event = await SchoolEvent_model_1.SchoolEvent.findByPk(id);
    return event ? event.update(input) : null;
}
async function deleteEvent(id) {
    const event = await SchoolEvent_model_1.SchoolEvent.findByPk(id);
    if (!event)
        return false;
    await event.destroy();
    return true;
}
