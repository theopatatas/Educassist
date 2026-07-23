import type { Request, Response } from "express";
import { getOverview } from "./admin.service";
import { Subject } from "../../db/models/Subject.model";

export async function overview(_req: Request, res: Response) {
  const data = await getOverview();
  return res.json({ ok: true, overview: data });
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
