import type { Request, Response } from "express";
import {
  createClassForTeacher,
  deleteClassForTeacher,
  getPublishedGradesForStudent,
  getPublishedGradesForTeacher,
  listAttendanceForStudent,
  listAttendanceForTeacher,
  listClassesForStudent,
  listClassesForTeacher,
  listStudentsForTeacherClass,
  savePublishedGradesForTeacher,
  saveAttendanceForTeacher,
  updateClassForTeacher,
} from "./classes.service";

export async function listMyClasses(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  const role = (req as any).user?.role as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const classes =
    role === "student" ? await listClassesForStudent(userId) : await listClassesForTeacher(userId);
  if (!classes) {
    return res.status(404).json({
      ok: false,
      message: role === "student" ? "Student profile not found" : "Teacher profile not found",
    });
  }
  return res.json({ ok: true, classes });
}

export async function createMyClass(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const cls = await createClassForTeacher(userId, req.body ?? {});
  if (!cls) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.status(201).json({ ok: true, class: cls });
}

export async function updateMyClass(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const result = await updateClassForTeacher(userId, req.params.id, req.body ?? {});
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Class not found" });
  return res.json({ ok: true, class: result });
}

export async function deleteMyClass(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const result = await deleteClassForTeacher(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Class not found" });
  return res.json({ ok: true });
}

export async function listMyClassStudents(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await listStudentsForTeacherClass(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Class not found" });
  return res.json({ ok: true, students: result });
}

export async function getMyAttendance(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  const role = (req as any).user?.role as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  if (role === "student") {
    const result = await listAttendanceForStudent(userId);
    if (!result) return res.status(404).json({ ok: false, message: "Student profile not found" });
    return res.json({ ok: true, records: result });
  }

  const result = await listAttendanceForTeacher(userId, { date: req.query.date as string | undefined });
  if (!result) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.json({ ok: true, records: result });
}

export async function saveMyAttendance(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const date = typeof req.body?.date === "string" ? req.body.date : "";
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  if (!date || records.length === 0) {
    return res.status(400).json({ ok: false, message: "date and records are required" });
  }

  const result = await saveAttendanceForTeacher(userId, { date, records });
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.json({ ok: true, saved: result });
}

export async function getMyGrades(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  const role = (req as any).user?.role as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  if (role === "student") {
    const rows = await getPublishedGradesForStudent(userId, { term: req.query.term as string | undefined });
    if (!rows) return res.status(404).json({ ok: false, message: "Student profile not found" });
    return res.json({ ok: true, rows });
  }

  const rows = await getPublishedGradesForTeacher(userId, {
    section: req.query.section as string | undefined,
    gradeLevel: req.query.gradeLevel as string | undefined,
    subject: req.query.subject as string | undefined,
    term: req.query.term as string | undefined,
  });
  if (rows === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.json({ ok: true, rows: rows.rows, published: rows.published });
}

export async function publishMyGrades(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  const body = req.body ?? {};
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!body.section || !body.gradeLevel || !body.subject || !body.term || rows.length === 0) {
    return res.status(400).json({ ok: false, message: "section, gradeLevel, subject, term, and rows are required" });
  }
  const saved = await savePublishedGradesForTeacher(userId, {
    section: body.section,
    gradeLevel: body.gradeLevel,
    subject: body.subject,
    term: body.term,
    publish: !!body.publish,
    rows,
  });
  if (saved === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (saved === false) return res.status(404).json({ ok: false, message: "Class not found for selected filters" });
  return res.json({ ok: true, saved });
}
