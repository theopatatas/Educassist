"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithAI = chatWithAI;
const ai_service_1 = require("./ai.service");
async function chatWithAI(req, res) {
    const user = req.user;
    const roleRaw = String(user?.role ?? "").toLowerCase();
    const role = roleRaw === "admin" || roleRaw === "teacher" ? roleRaw : "student";
    const prompt = String(req.body?.prompt ?? "").trim();
    const context = req.body?.context ? String(req.body.context) : undefined;
    if (!prompt) {
        return res.status(400).json({ ok: false, message: "Prompt is required" });
    }
    const result = await (0, ai_service_1.generateAIResponse)({ role, prompt, context });
    if (!result.ok) {
        return res.status(400).json({ ok: false, message: "AI request blocked", reason: result.reason });
    }
    return res.json({ ok: true, text: result.text, provider: result.provider });
}
