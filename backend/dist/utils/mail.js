"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const env_1 = require("../config/env");
async function sendMail(input) {
    if (!env_1.env.MAIL_API_URL || !env_1.env.MAIL_API_KEY) {
        throw new Error("Mail API is not configured");
    }
    const res = await fetch(env_1.env.MAIL_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": env_1.env.MAIL_API_KEY,
        },
        body: JSON.stringify({
            to: input.to,
            to_name: input.toName ?? "",
            subject: input.subject,
            html: input.html,
            text: input.text ?? "",
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Mail API failed (${res.status}): ${body || "Unknown error"}`);
    }
    return res.json().catch(() => ({}));
}
