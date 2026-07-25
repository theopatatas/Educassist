"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithAI = chatWithAI;
exports.chatWithAttachments = chatWithAttachments;
const ai_service_1 = require("./ai.service");
async function chatWithAI(req, res) {
    const user = req.user;
    const roleRaw = String(user?.role ?? "").toLowerCase();
    const role = roleRaw === "super_admin" || roleRaw === "admin"
        ? "admin"
        : roleRaw === "teacher"
            ? "teacher"
            : "student";
    const prompt = String(req.body?.prompt ?? "").trim();
    const context = req.body?.context ? String(req.body.context) : undefined;
    if (!prompt) {
        return res.status(400).json({ ok: false, message: "Prompt is required" });
    }
    const result = await (0, ai_service_1.generateAIResponse)({ role, prompt, context });
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
async function chatWithAttachments(req, res) {
    const prompt = String(req.body?.prompt ?? "").trim() ||
        "Please analyze the attached material and explain how it can support my teaching.";
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
        return res
            .status(400)
            .json({ ok: false, message: "Select at least one file or photo." });
    }
    try {
        const result = await (0, ai_service_1.generateAIResponseWithAttachments)({ role: "teacher", prompt }, files.map((file) => ({
            filename: file.originalname,
            mimeType: file.mimetype,
            data: file.buffer,
        })));
        if (!result.ok) {
            return res.status(400).json({
                ok: false,
                message: "AI request blocked",
                reason: result.reason,
            });
        }
        return res.json({ ok: true, text: result.text, provider: result.provider });
    }
    catch {
        return res.status(503).json({
            ok: false,
            message: "AI file analysis is unavailable. Check the AI provider configuration and try again.",
        });
    }
}
