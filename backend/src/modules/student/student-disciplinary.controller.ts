import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../types/auth";
import {
  createStudentDisciplinaryRecord,
  listStudentDisciplinaryRecords,
  updateStudentDisciplinaryRecord,
} from "./student-disciplinary.service";

function context(req: AuthenticatedRequest) {
  return {
    userId: Number(req.user?.sub),
    role: String(req.user?.role ?? "super_admin"),
    ipAddress: req.ip,
    deviceInfo: req.get("user-agent") ?? null,
  };
}

export async function listDisciplinary(req: Request, res: Response) {
  const result = await listStudentDisciplinaryRecords(Number(req.params.id), {
    academicYear: typeof req.query.academicYear === "string" ? req.query.academicYear : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
    incidentType: typeof req.query.incidentType === "string" ? req.query.incidentType : undefined,
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
  });
  if (!result) return res.status(404).json({ ok: false, message: "Student not found." });
  return res.json({ ok: true, ...result });
}

export async function createDisciplinary(req: Request, res: Response) {
  const result = await createStudentDisciplinaryRecord(
    Number(req.params.id),
    req.body ?? {},
    context(req as AuthenticatedRequest),
  );
  if (!result.ok) return res.status(result.code).json(result);
  return res.status(201).json(result);
}

export async function updateDisciplinary(req: Request, res: Response) {
  const result = await updateStudentDisciplinaryRecord(
    Number(req.params.id),
    Number(req.params.recordId),
    req.body ?? {},
    context(req as AuthenticatedRequest),
  );
  if (!result.ok) return res.status(result.code).json(result);
  return res.json(result);
}
