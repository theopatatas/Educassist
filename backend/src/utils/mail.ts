import { env } from "../config/env";

const EDUCASSIST_MAIL_NAME = "EducAssist";

type SendMailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: SendMailInput) {
  if (!env.MAIL_API_URL || !env.MAIL_API_KEY) {
    throw new Error("Mail API is not configured");
  }

  const res = await fetch(env.MAIL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.MAIL_API_KEY,
    },
    body: JSON.stringify({
      to: input.to,
      to_name: input.toName ?? "",
      from_name: EDUCASSIST_MAIL_NAME,
      reply_to_name: EDUCASSIST_MAIL_NAME,
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
