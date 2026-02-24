import type { Request, Response } from "express";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudentOverviewById,
  getStudentByUserId,
  listStudents,
  updateStudent,
} from "./student.service";

export async function create(req: Request, res: Response) {
  const result = await createStudent(req.body);
  if (!result.ok) return res.status(result.code).json({ ok: false, message: result.message });
  return res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  const students = await listStudents();
  return res.json({ ok: true, students });
}

export async function getById(req: Request, res: Response) {
  const student = await getStudentById(req.params.id);
  if (!student) return res.status(404).json({ ok: false, message: "Student not found" });
  return res.json({ ok: true, student });
}

export async function overview(req: Request, res: Response) {
  const data = await getStudentOverviewById(req.params.id);
  if (!data) return res.status(404).json({ ok: false, message: "Student not found" });
  return res.json({ ok: true, overview: data });
}

export async function me(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const student = await getStudentByUserId(userId);
  if (!student) return res.status(404).json({ ok: false, message: "Student profile not found" });
  return res.json({ ok: true, student });
}

export async function update(req: Request, res: Response) {
  const student = await updateStudent(req.params.id, req.body ?? {});
  if (!student) return res.status(404).json({ ok: false, message: "Student not found" });
  return res.json({ ok: true, student });
}

export async function remove(req: Request, res: Response) {
  const ok = await deleteStudent(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, message: "Student not found" });
  return res.json({ ok: true });
}
