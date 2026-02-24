"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overview = overview;
const admin_service_1 = require("./admin.service");
async function overview(_req, res) {
    const data = await (0, admin_service_1.getOverview)();
    return res.json({ ok: true, overview: data });
}
