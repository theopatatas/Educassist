import { applyGuardrails, buildSystemPrompt } from "./ai.guardrails";
import { createAIProvider, type AIMessage } from "./ai.provider";

export type AIRequest = {
  role: "student" | "teacher" | "admin";
  prompt: string;
  context?: string;
};

export type AIServiceResult =
  | { ok: true; text: string; provider: "openai" | "rules" }
  | { ok: false; reason: string };

export async function generateAIResponse(req: AIRequest): Promise<AIServiceResult> {
  const guardrail = applyGuardrails([req.prompt, req.context].filter(Boolean).join("\n"));
  if (!guardrail.ok) {
    return { ok: false, reason: guardrail.reason ?? "blocked" };
  }

  const messages: AIMessage[] = [{ role: "system", content: buildSystemPrompt(req.role) }];
  if (req.context) {
    messages.push({ role: "user", content: `Context:\n${req.context}` });
  }
  messages.push({ role: "user", content: guardrail.sanitized });

  const provider = createAIProvider();
  const response = await provider.generate(messages);

  if (!response.text) {
    return { ok: false, reason: "empty_response" };
  }

  return { ok: true, text: response.text, provider: response.provider };
}
