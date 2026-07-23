"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = void 0;
exports.listEvents = listEvents;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const sequelize_1 = require("sequelize");
const SchoolEvent_model_1 = require("../../db/models/SchoolEvent.model");
const User_model_1 = require("../../db/models/User.model");
async function listEvents(query) {
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
        const expected = (event.endDate || event.eventDate) < today ? "Completed" : "Scheduled";
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
        attributes: ["id", "firstName", "lastName", "displayName", "email"],
    });
    const byId = new Map(creators.map((user) => [String(user.id), user]));
    return events.map((event) => {
        const row = event.toJSON();
        const creator = byId.get(String(event.createdBy));
        return {
            ...row,
            creator: creator
                ? {
                    id: Number(creator.id),
                    name: creator.displayName ||
                        [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
                        creator.email,
                }
                : null,
        };
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
