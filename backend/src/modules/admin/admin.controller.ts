import type { Request, Response } from "express";
import {
  getOverview,
  getPendingTasks,
  getRecentActivities,
} from "./admin.service";
import { Subject } from "../../db/models/Subject.model";
import PDFDocument from "pdfkit";
import {
  analyticsExportRows,
  getAdminAnalytics,
  type AnalyticsFilterInput,
} from "./analytics.service";

export async function overview(_req: Request, res: Response) {
  const data = await getOverview();
  return res.json({ ok: true, overview: data });
}

export async function recentActivities(_req: Request, res: Response) {
  const activities = await getRecentActivities();
  return res.json({ ok: true, activities });
}

export async function pendingTasks(_req: Request, res: Response) {
  const tasks = await getPendingTasks();
  return res.json({ ok: true, tasks });
}

export async function analytics(req: Request, res: Response) {
  const result = await getAdminAnalytics(
    req.query as AnalyticsFilterInput,
  );
  res.setHeader("Cache-Control", "private, no-store");
  return res.json({ ok: true, analytics: result });
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function xmlCell(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function exportAnalytics(req: Request, res: Response) {
  const format = String(req.params.format ?? "").toLowerCase();
  if (!["pdf", "excel", "csv"].includes(format)) {
    return res
      .status(400)
      .json({ ok: false, message: "Unsupported export format" });
  }
  const result = await getAdminAnalytics(
    req.query as AnalyticsFilterInput,
  );
  const rows = analyticsExportRows(result);
  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="educassist-analytics.pdf"',
    );
    const document = new PDFDocument({ margin: 48 });
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
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="educassist-analytics.csv"',
    );
    return res.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
  }
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="educassist-analytics.xls"',
  );
  return res.send(
    `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Analytics"><Table>${rows
      .map(
        (row) =>
          `<Row>${row
            .map(
              (cell) =>
                `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${xmlCell(cell)}</Data></Cell>`,
            )
            .join("")}</Row>`,
      )
      .join("")}</Table></Worksheet></Workbook>`,
  );
}

export async function listAdminSubjects(_req: Request, res: Response) {
  const subjects = await Subject.findAll({
    where: { createdByAdmin: true },
    order: [["name", "ASC"]],
  });
  return res.json({ ok: true, subjects });
}

export async function createAdminSubject(req: Request, res: Response) {
  const name = String(req.body?.name ?? "").trim();
  const code = String(req.body?.code ?? "").trim() || null;
  if (!name) {
    return res
      .status(400)
      .json({ ok: false, message: "Subject name is required" });
  }
  const [subject, created] = await Subject.findOrCreate({
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
