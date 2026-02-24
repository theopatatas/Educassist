import type { Request, Response } from "express";
import { Student } from "../../db/models/Student.model";
import {
  createParent,
  deleteParent,
  getParentById,
  getParentOverviewByUserId,
  getParentByUserId,
  listParents,
  updateParent,
} from "./parent.service";

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
  let studentName: string | null = null;
  if (parent.studentId) {
    const student = await Student.findByPk(parent.studentId, {
      attributes: ["firstName", "lastName"],
    });
    if (student) {
      studentName = `${student.firstName} ${student.lastName}`.trim();
    }
  }
  return res.json({ ok: true, parent: { ...parent.toJSON(), studentName } });
}

export async function overview(req: Request, res: Response) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const data = await getParentOverviewByUserId(userId);
  if (data === null) return res.status(404).json({ ok: false, message: "Parent profile not found" });
  return res.json({ ok: true, overview: data });
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
