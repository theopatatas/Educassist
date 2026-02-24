"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
const ai_guardrails_1 = require("./ai.guardrails");
const ai_provider_1 = require("./ai.provider");
async function generateAIResponse(req) {
    const guardrail = (0, ai_guardrails_1.applyGuardrails)([req.prompt, req.context].filter(Boolean).join("\n"));
    if (!guardrail.ok) {
        return { ok: false, reason: guardrail.reason ?? "blocked" };
    }
    const messages = [{ role: "system", content: (0, ai_guardrails_1.buildSystemPrompt)(req.role) }];
    if (req.context) {
        messages.push({ role: "user", content: `Context:\n${req.context}` });
    }
    messages.push({ role: "user", content: guardrail.sanitized });
    const provider = (0, ai_provider_1.createAIProvider)();
    const response = await provider.generate(messages);
    if (!response.text) {
        return { ok: false, reason: "empty_response" };
    }
    return { ok: true, text: response.text, provider: response.provider };
}
