import type { Request, Response } from "express";
import {
  createParent,
  deleteParent,
  getParentById,
  getParentOverviewByUserId,
  getParentAcademicRecordByUserId,
  getParentAcademicSessionsByUserId,
  getParentLinkedStudentsByUserId,
  getParentByUserId,
  listParents,
  updateParent,
  getParentSelectedStudentByUserId,
} from "./parent.service";
import { listStudentDisciplinaryRecords } from "../student/student-disciplinary.service";

export async function create(req: Request, res: Response) {
  const result = await createParent(req.body);
  if (!result.ok) return res.status(result.code).json({ ok: false, message: result.message });
  return res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  const parents = await listParents();
  return res.json({ ok: true, parents });
}

export async function getById(req: Request, res: Response) {
  const parent = await getParentById(req.params.id);
  if (!parent) return res.status(404).json({ ok: false, message: "Parent not found" });
  return res.json({ ok: true, parent });
}

export async function me(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const parent = await getParentByUserId(userId);
  if (!parent) return res.status(404).json({ ok: false, message: "Parent profile not found" });
  const linkedStudents = await getParentLinkedStudentsByUserId(userId);
  const primaryStudent =
    linkedStudents?.find((student) => student.primary) ??
    linkedStudents?.[0] ??
    null;
  return res.json({
    ok: true,
    parent: {
      ...parent.toJSON(),
      studentName: primaryStudent?.name ?? null,
      linkedStudentCount: linkedStudents?.length ?? 0,
    },
  });
}

export async function linkedStudents(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  const students = await getParentLinkedStudentsByUserId(userId);
  if (students === null)
    return res
      .status(404)
      .json({ ok: false, message: "Parent profile not found" });
  return res.json({ ok: true, students });
}

export async function overview(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const data = await getParentOverviewByUserId(
    userId,
    typeof req.query.studentId === "string" ? req.query.studentId : undefined,
  );
  if (data === null) return res.status(404).json({ ok: false, message: "Parent profile not found" });
  if ("forbidden" in data)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  return res.json({ ok: true, overview: data });
}

export async function academicSessions(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  const sessions = await getParentAcademicSessionsByUserId(
    userId,
    typeof req.query.studentId === "string" ? req.query.studentId : undefined,
  );
  if (sessions === null)
    return res
      .status(404)
      .json({ ok: false, message: "Parent profile not found" });
  if (!Array.isArray(sessions) && "forbidden" in sessions)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  return res.json({ ok: true, sessions });
}

export async function academicRecord(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  const data = await getParentAcademicRecordByUserId(userId, {
    studentId:
      typeof req.query.studentId === "string"
        ? req.query.studentId
        : undefined,
    academicYear:
      typeof req.query.academicYear === "string"
        ? req.query.academicYear
        : undefined,
    gradeLevel:
      typeof req.query.gradeLevel === "string"
        ? req.query.gradeLevel
        : undefined,
  });
  if (data === null)
    return res
      .status(404)
      .json({ ok: false, message: "Parent profile not found" });
  if ("forbidden" in data)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  return res.json({ ok: true, ...data });
}

export async function disciplinaryRecords(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId)
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  const studentId =
    typeof req.query.studentId === "string"
      ? Number(req.query.studentId)
      : Number.NaN;
  if (!Number.isInteger(studentId) || studentId <= 0)
    return res
      .status(400)
      .json({ ok: false, message: "A linked student is required." });
  const selected = await getParentSelectedStudentByUserId(
    userId,
    String(studentId),
  );
  if (selected === null)
    return res
      .status(404)
      .json({ ok: false, message: "Parent profile not found" });
  if ("forbidden" in selected || !selected.student)
    return res
      .status(403)
      .json({ ok: false, message: "Student is not linked to this parent" });
  const result = await listStudentDisciplinaryRecords(studentId, {
    academicYear:
      typeof req.query.academicYear === "string"
        ? req.query.academicYear
        : undefined,
    status:
      typeof req.query.status === "string" ? req.query.status : undefined,
    severity:
      typeof req.query.severity === "string" ? req.query.severity : undefined,
    incidentType:
      typeof req.query.incidentType === "string"
        ? req.query.incidentType
        : undefined,
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
  });
  if (!result)
    return res.status(404).json({ ok: false, message: "Student not found." });
  return res.json({ ok: true, ...result });
}

export async function update(req: Request, res: Response) {
  const parent = await updateParent(req.params.id, req.body ?? {});
  if (!parent) return res.status(404).json({ ok: false, message: "Parent not found" });
  return res.json({ ok: true, parent });
}

export async function remove(req: Request, res: Response) {
  const ok = await deleteParent(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, message: "Parent not found" });
  return res.json({ ok: true });
}
