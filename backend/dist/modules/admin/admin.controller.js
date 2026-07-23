"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overview = overview;
exports.listAdminSubjects = listAdminSubjects;
exports.createAdminSubject = createAdminSubject;
const admin_service_1 = require("./admin.service");
const Subject_model_1 = require("../../db/models/Subject.model");
async function overview(_req, res) {
    const data = await (0, admin_service_1.getOverview)();
    return res.json({ ok: true, overview: data });
}
async function listAdminSubjects(_req, res) {
    const subjects = await Subject_model_1.Subject.findAll({
        where: { createdByAdmin: true },
        order: [["name", "ASC"]],
    });
    return res.json({ ok: true, subjects });
}
async function createAdminSubject(req, res) {
    const name = String(req.body?.name ?? "").trim();
    const code = String(req.body?.code ?? "").trim() || null;
    if (!name) {
        return res
            .status(400)
            .json({ ok: false, message: "Subject name is required" });
    }
    const [subject, created] = await Subject_model_1.Subject.findOrCreate({
        where: { name },
        defaults: { name, code, createdByAdmin: true },
    });
    if (!created) {
        await subject.update({
            code: code ?? subject.code,
            createdByAdmin: true,
        });
    }
    return res.status(created ? 201 : 200).json({ ok: true, subject });
}
