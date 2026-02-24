import type { Request, Response } from "express";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeacherByUserId,
  listTeachers,
  listTeacherSubjects,
  addSubjectForTeacher,
  addTeachingLoadForTeacher,
  updateTeacher,
} from "./teacher.service";

export async function create(req: Request, res: Response) {
  if (!req.body?.employeeNumber) {
    return res.status(400).json({ ok: false, message: "Employee number is required" });
  }
  const result = await createTeacher(req.body);
  if (!result.ok) return res.status(result.code).json({ ok: false, message: result.message });
  return res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  const teachers = await listTeachers();
  return res.json({ ok: true, teachers });
}

export async function getById(req: Request, res: Response) {
  const teacher = await getTeacherById(req.params.id);
  if (!teacher) return res.status(404).json({ ok: false, message: "Teacher not found" });
  return res.json({ ok: true, teacher });
}

export async function me(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const teacher = await getTeacherByUserId(userId);
  if (!teacher) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.json({ ok: true, teacher });
}

export async function update(req: Request, res: Response) {
  const teacher = await updateTeacher(req.params.id, req.body ?? {});
  if (!teacher) return res.status(404).json({ ok: false, message: "Teacher not found" });
  return res.json({ ok: true, teacher });
}

export async function remove(req: Request, res: Response) {
  const ok = await deleteTeacher(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, message: "Teacher not found" });
  return res.json({ ok: true });
}

export async function listSubjects(req: Request, res: Response) {
  const subjects = await listTeacherSubjects(req.params.id);
  return res.json({ ok: true, subjects });
}

export async function addSubject(req: Request, res: Response) {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ ok: false, message: "Subject name is required" });
  const result = await addSubjectForTeacher(req.params.id, { name });
  if (!result.ok) return res.status(result.code).json({ ok: false, message: result.message });
  return res.status(201).json(result);
}

export async function addTeachingLoad(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  if (entries.length === 0) {
    return res.status(400).json({ ok: false, message: "Entries are required" });
  }
  const result = await addTeachingLoadForTeacher(userId, entries);
  if (!result.ok) return res.status(result.code).json({ ok: false, message: result.message });
  return res.json({ ok: true });
}
