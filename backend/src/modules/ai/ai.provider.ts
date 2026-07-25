import OpenAI from "openai";
import { env } from "../../config/env";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIResponse = {
  text: string;
  provider: "openai" | "rules";
};

export type AIProvider = {
  name: AIResponse["provider"];
  generate: (messages: AIMessage[]) => Promise<AIResponse>;
};

export type AIAttachment = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

function createRulesProvider(): AIProvider {
  return {
    name: "rules",
    async generate(messages) {
      const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
      let text = "I can help with explanations, practice questions, or summaries. Tell me the topic.";

      if (/explain|explanation|why|how/i.test(userText)) {
        text =
          "Here is a short explanation:\n1. Identify the main idea.\n2. Break it into smaller parts.\n3. Work through a simple example.\nIf you share the topic, I can tailor this.";
      } else if (/quiz|practice|question/i.test(userText)) {
        text =
          "Practice set (general):\n1. Define the key term.\n2. Give one real-world example.\n3. Solve a simple problem using the concept.";
      } else if (/summary|summarize/i.test(userText)) {
        text =
          "Summary template:\n- Key idea\n- Supporting points\n- Example\nShare the content to summarize and I can format it for you.";
      }

      return { text, provider: "rules" };
    },
  };
}

function createOpenAIProvider(): AIProvider {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  });
  const rawModel = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const model =
    env.OPENAI_BASE_URL?.includes("openrouter.ai") && !rawModel.includes("/")
      ? `openai/${rawModel}`
      : rawModel;

  return {
    name: "openai",
    async generate(messages) {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.4,
      });

      const text = completion.choices[0]?.message?.content ?? "";
      return { text, provider: "openai" };
    },
  };
}

export function createAIProvider(): AIProvider {
  if (!env.OPENAI_API_KEY) return createRulesProvider();

  const openai = createOpenAIProvider();
  const rules = createRulesProvider();

  return {
    name: "openai",
    async generate(messages) {
      try {
        return await openai.generate(messages);
      } catch {
        return await rules.generate(messages);
      }
    },
  };
}

export function isExternalAIEnabled() {
  return Boolean(env.OPENAI_API_KEY);
}

export async function generateOpenAIResponseWithAttachments(
  messages: AIMessage[],
  attachments: AIAttachment[],
) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("AI file analysis is not configured");
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  });
  const rawModel = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const model =
    env.OPENAI_BASE_URL?.includes("openrouter.ai") && !rawModel.includes("/")
      ? `openai/${rawModel}`
      : rawModel;
  const systemMessage = messages.find((message) => message.role === "system");
  const userMessages = messages.filter((message) => message.role === "user");
  const prompt = userMessages.map((message) => message.content).join("\n\n");
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: prompt },
    ...attachments.map(
      (
        attachment,
      ): OpenAI.Chat.Completions.ChatCompletionContentPart =>
        attachment.mimeType.startsWith("image/")
          ? {
              type: "image_url",
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`,
              },
            }
          : {
              type: "file",
              file: {
                filename: attachment.filename,
                file_data: `data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`,
              },
            },
    ),
  ];
  const completion = await client.chat.completions.create({
    model,
    messages: [
      ...(systemMessage
        ? ([systemMessage] as OpenAI.Chat.Completions.ChatCompletionMessageParam[])
        : []),
      { role: "user", content },
    ],
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content ?? "";
}
