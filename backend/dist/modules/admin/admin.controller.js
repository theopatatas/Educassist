"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overview = overview;
exports.recentActivities = recentActivities;
exports.pendingTasks = pendingTasks;
exports.analytics = analytics;
exports.exportAnalytics = exportAnalytics;
exports.listAdminSubjects = listAdminSubjects;
exports.createAdminSubject = createAdminSubject;
const admin_service_1 = require("./admin.service");
const Subject_model_1 = require("../../db/models/Subject.model");
const pdfkit_1 = __importDefault(require("pdfkit"));
const analytics_service_1 = require("./analytics.service");
async function overview(_req, res) {
    const data = await (0, admin_service_1.getOverview)();
    return res.json({ ok: true, overview: data });
}
async function recentActivities(_req, res) {
    const activities = await (0, admin_service_1.getRecentActivities)();
    return res.json({ ok: true, activities });
}
async function pendingTasks(_req, res) {
    const tasks = await (0, admin_service_1.getPendingTasks)();
    return res.json({ ok: true, tasks });
}
async function analytics(req, res) {
    const result = await (0, analytics_service_1.getAdminAnalytics)(req.query);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ ok: true, analytics: result });
}
function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function xmlCell(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
async function exportAnalytics(req, res) {
    const format = String(req.params.format ?? "").toLowerCase();
    if (!["pdf", "excel", "csv"].includes(format)) {
        return res
            .status(400)
            .json({ ok: false, message: "Unsupported export format" });
    }
    const result = await (0, analytics_service_1.getAdminAnalytics)(req.query);
    const rows = (0, analytics_service_1.analyticsExportRows)(result);
    if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="educassist-analytics.pdf"');
        const document = new pdfkit_1.default({ margin: 48 });
        document.pipe(res);
        document.fontSize(20).text("EducAssist Analytics Summary");
        document
            .moveDown(0.4)
            .fontSize(10)
            .fillColor("#64748b")
            .text(`Generated ${new Date().toLocaleString()}`);
        document.moveDown().fillColor("#0f172a");
        rows.slice(1).forEach(([label, value]) => {
            document.fontSize(11).text(`${label}: ${String(value)}`);
            document.moveDown(0.25);
        });
        document.end();
        return;
    }
    if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="educassist-analytics.csv"');
        return res.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
    }
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="educassist-analytics.xls"');
    return res.send(`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Analytics"><Table>${rows
        .map((row) => `<Row>${row
        .map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${xmlCell(cell)}</Data></Cell>`)
        .join("")}</Row>`)
        .join("")}</Table></Worksheet></Workbook>`);
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
