import type { Request, Response } from "express";
import { getOverview } from "./admin.service";

export async function overview(_req: Request, res: Response) {
  const data = await getOverview();
  return res.json({ ok: true, overview: data });
}
