import type { Request, Response } from "express";
import { deleteUser, getUserById, listUsers, updateUser } from "./users.service";

export async function list(req: Request, res: Response) {
  const users = await listUsers();
  return res.json({ ok: true, users });
}

export async function getById(req: Request, res: Response) {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
}

export async function update(req: Request, res: Response) {
  const user = await updateUser(req.params.id, req.body ?? {});
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
}

export async function remove(req: Request, res: Response) {
  const ok = await deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true });
}
