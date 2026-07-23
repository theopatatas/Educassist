import { env } from "../config/env";

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
