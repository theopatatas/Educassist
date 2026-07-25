import type { Request, Response } from "express";
import {
  generateAIResponse,
  generateAIResponseWithAttachments,
} from "./ai.service";

export async function chatWithAI(req: Request, res: Response) {
  const user = (req as Request & { user?: { role?: string } }).user;
  const roleRaw = String(user?.role ?? "").toLowerCase();
  const role =
    roleRaw === "super_admin" || roleRaw === "admin"
      ? "admin"
      : roleRaw === "teacher"
        ? "teacher"
        : "student";

  const prompt = String(req.body?.prompt ?? "").trim();
  const context = req.body?.context ? String(req.body.context) : undefined;

  if (!prompt) {
    return res.status(400).json({ ok: false, message: "Prompt is required" });
  }

  const result = await generateAIResponse({ role, prompt, context });
  if (!result.ok) {
    return res
      .status(400)
      .json({
        ok: false,
        message: "AI request blocked",
        reason: result.reason,
      });
  }

  return res.json({ ok: true, text: result.text, provider: result.provider });
}

export async function chatWithAttachments(req: Request, res: Response) {
  const prompt =
    String(req.body?.prompt ?? "").trim() ||
    "Please analyze the attached material and explain how it can support my teaching.";
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res
      .status(400)
      .json({ ok: false, message: "Select at least one file or photo." });
  }

  try {
    const result = await generateAIResponseWithAttachments(
      { role: "teacher", prompt },
      files.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        data: file.buffer,
      })),
    );
    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        message: "AI request blocked",
        reason: result.reason,
      });
    }
    return res.json({ ok: true, text: result.text, provider: result.provider });
  } catch {
    return res.status(503).json({
      ok: false,
      message:
        "AI file analysis is unavailable. Check the AI provider configuration and try again.",
    });
  }
}
