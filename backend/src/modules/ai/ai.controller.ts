import type { Request, Response } from "express";
import { generateAIResponse } from "./ai.service";

export async function chatWithAI(req: Request, res: Response) {
  const user = (req as Request & { user?: { role?: string } }).user;
  const roleRaw = String(user?.role ?? "").toLowerCase();
  const role = roleRaw === "admin" || roleRaw === "teacher" ? roleRaw : "student";

  const prompt = String(req.body?.prompt ?? "").trim();
  const context = req.body?.context ? String(req.body.context) : undefined;

  if (!prompt) {
    return res.status(400).json({ ok: false, message: "Prompt is required" });
  }

  const result = await generateAIResponse({ role, prompt, context });
  if (!result.ok) {
    return res.status(400).json({ ok: false, message: "AI request blocked", reason: result.reason });
  }

  return res.json({ ok: true, text: result.text, provider: result.provider });
}
