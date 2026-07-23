"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preview = preview;
exports.exportReport = exportReport;
const pdfkit_1 = __importDefault(require("pdfkit"));
const admin_reports_service_1 = require("./admin-reports.service");
const reportTypes = new Set(["students", "attendance", "enrollment", "events"]);
function typeFromRequest(req) {
    return reportTypes.has(req.params.type)
        ? req.params.type
        : null;
}
function filters(req) {
    return {
        grade: String(req.query.grade ?? "").trim() || undefined,
        section: String(req.query.section ?? "").trim() || undefined,
        dateFrom: String(req.query.dateFrom ?? "").trim() || undefined,
        dateTo: String(req.query.dateTo ?? "").trim() || undefined,
    };
}
function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}
async function preview(req, res) {
    const type = typeFromRequest(req);
    if (!type)
        return res.status(400).json({ ok: false, message: "Invalid report type" });
    const report = await (0, admin_reports_service_1.buildAdminReport)(type, filters(req));
    return res.json({ ok: true, report, totalRecords: report.rows.length });
}
async function exportReport(req, res) {
    const type = typeFromRequest(req);
    const format = String(req.query.format ?? "").toLowerCase();
    if (!type || !["csv", "excel", "pdf"].includes(format))
        return res
            .status(400)
            .json({ ok: false, message: "Invalid report export request" });
    const report = await (0, admin_reports_service_1.buildAdminReport)(type, filters(req));
    const baseName = `${type}-report-${new Date().toISOString().slice(0, 10)}`;
    if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
        const document = new pdfkit_1.default({
            margin: 36,
            size: "A4",
            layout: "landscape",
        });
        document.pipe(res);
        document.fontSize(18).text(report.name);
        document
            .fontSize(9)
            .text(`Total records: ${report.rows.length}`)
            .moveDown();
        document.fontSize(8).text(report.columns.join(" | "));
        document.moveDown(0.5);
        for (const row of report.rows)
            document.text(row.map(String).join(" | "));
        document.end();
        return;
    }
    if (format === "excel") {
        const escape = (value) => String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const table = `<table><thead><tr>${report.columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead><tbody>${report.rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xls"`);
        return res.send(`\ufeff<html><body><h2>${report.name}</h2>${table}</body></html>`);
    }
    const csv = [report.columns, ...report.rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.csv"`);
    return res.send(`\ufeff${csv}`);
}
