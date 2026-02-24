import type { Request, Response } from "express";
import {
  createAssignmentForTeacher,
  listAssignmentResultsForTeacher,
  listAssignmentsForStudent,
  listAssignmentsForTeacher,
  submitAssignmentForStudent,
} from "./assignments.service";

export async function listMyAssignments(req: Request, res: Response) {
  const user = (req as Request & { user?: { sub?: string; role?: string } }).user;
  const userId = user?.sub;
  const role = user?.role;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const rows =
    role === "student"
      ? await listAssignmentsForStudent(userId)
      : await listAssignmentsForTeacher(userId, {
          section: req.query.section as string | undefined,
          gradeLevel: req.query.gradeLevel as string | undefined,
        });
  if (rows === null) {
    return res
      .status(404)
      .json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
  }
  return res.json({ ok: true, assignments: rows });
}

export async function createMyAssignment(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const assignment = await createAssignmentForTeacher(userId, req.body ?? {});
  if (assignment === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (assignment === false) return res.status(400).json({ ok: false, message: "Invalid class or payload" });
  return res.status(201).json({ ok: true, assignment });
}

export async function submitMyAssignment(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await submitAssignmentForStudent(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Student profile not found" });
  if (result === false) return res.status(400).json({ ok: false, message: "Assignment not found for this student" });
  return res.json({ ok: true, submission: result });
}

export async function listMyAssignmentResults(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const result = await listAssignmentResultsForTeacher(userId, req.params.id);
  if (result === null) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  if (result === false) return res.status(404).json({ ok: false, message: "Assignment not found" });
  return res.json({ ok: true, ...result });
}
