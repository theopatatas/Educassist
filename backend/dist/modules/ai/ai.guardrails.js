"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyGuardrails = applyGuardrails;
exports.buildSystemPrompt = buildSystemPrompt;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:(?:\+?\d{1,3})?[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;
const BLOCKED_PATTERNS = [
    { pattern: /\b(self-harm|suicide|kill myself)\b/i, reason: "self-harm request" },
    { pattern: /\b(credit card|ssn|social security)\b/i, reason: "sensitive data request" },
    { pattern: /\b(make a bomb|build a bomb|weapon|explosive)\b/i, reason: "weapons request" },
    { pattern: /\b(hack|phish|malware)\b/i, reason: "cyber abuse request" },
];
function applyGuardrails(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return { ok: false, sanitized: "", reason: "empty prompt" };
    for (const rule of BLOCKED_PATTERNS) {
        if (rule.pattern.test(trimmed)) {
            return { ok: false, sanitized: "", reason: rule.reason };
        }
    }
    const redacted = trimmed.replace(EMAIL_REGEX, "[redacted-email]").replace(PHONE_REGEX, "[redacted-phone]");
    return { ok: true, sanitized: redacted };
}
function buildSystemPrompt(role) {
    const roleLine = role === "student"
        ? "You are a Study Buddy for a student."
        : role === "teacher"
            ? "You are an assistant for a teacher."
            : "You are an assistant for a school administrator.";
    return [
        roleLine,
        "Stay within educational scope.",
        "Do not provide personal data or encourage unsafe behavior.",
        "Give concise, step-by-step explanations when helpful.",
    ].join(" ");
}
