import type { Request, Response } from "express";
import { buildAdminReport, type ReportType } from "./admin-reports.service";

const PDFDocument: new (options?: object) => {
  fontSize(size: number): any;
  text(text: string, options?: object): any;
  moveDown(amount?: number): any;
  pipe(stream: NodeJS.WritableStream): void;
  end(): void;
} = require("pdfkit");

const reportTypes = new Set(["students", "attendance", "enrollment", "events"]);

function typeFromRequest(req: Request) {
  return reportTypes.has(req.params.type)
    ? (req.params.type as ReportType)
    : null;
}

function filters(req: Request) {
  return {
    grade: String(req.query.grade ?? "").trim() || undefined,
    section: String(req.query.section ?? "").trim() || undefined,
    dateFrom: String(req.query.dateFrom ?? "").trim() || undefined,
    dateTo: String(req.query.dateTo ?? "").trim() || undefined,
  };
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function preview(req: Request, res: Response) {
  const type = typeFromRequest(req);
  if (!type)
    return res.status(400).json({ ok: false, message: "Invalid report type" });
  const report = await buildAdminReport(type, filters(req));
  return res.json({ ok: true, report, totalRecords: report.rows.length });
}

export async function exportReport(req: Request, res: Response) {
  const type = typeFromRequest(req);
  const format = String(req.query.format ?? "").toLowerCase();
  if (!type || !["csv", "excel", "pdf"].includes(format))
    return res
      .status(400)
      .json({ ok: false, message: "Invalid report export request" });
  const report = await buildAdminReport(type, filters(req));
  const baseName = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.pdf"`,
    );
    const document = new PDFDocument({
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
    for (const row of report.rows) document.text(row.map(String).join(" | "));
    document.end();
    return;
  }

  if (format === "excel") {
    const escape = (value: string | number) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const table = `<table><thead><tr>${report.columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead><tbody>${report.rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.xls"`,
    );
    return res.send(
      `\ufeff<html><body><h2>${report.name}</h2>${table}</body></html>`,
    );
  }

  const csv = [report.columns, ...report.rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${baseName}.csv"`,
  );
  return res.send(`\ufeff${csv}`);
}
