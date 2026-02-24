"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAIProvider = createAIProvider;
exports.isExternalAIEnabled = isExternalAIEnabled;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../../config/env");
function createRulesProvider() {
    return {
        name: "rules",
        async generate(messages) {
            const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
            let text = "I can help with explanations, practice questions, or summaries. Tell me the topic.";
            if (/explain|explanation|why|how/i.test(userText)) {
                text =
                    "Here is a short explanation:\n1. Identify the main idea.\n2. Break it into smaller parts.\n3. Work through a simple example.\nIf you share the topic, I can tailor this.";
            }
            else if (/quiz|practice|question/i.test(userText)) {
                text =
                    "Practice set (general):\n1. Define the key term.\n2. Give one real-world example.\n3. Solve a simple problem using the concept.";
            }
            else if (/summary|summarize/i.test(userText)) {
                text =
                    "Summary template:\n- Key idea\n- Supporting points\n- Example\nShare the content to summarize and I can format it for you.";
            }
            return { text, provider: "rules" };
        },
    };
}
function createOpenAIProvider() {
    const client = new openai_1.default({ apiKey: env_1.env.OPENAI_API_KEY });
    const model = env_1.env.OPENAI_MODEL ?? "gpt-4o-mini";
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
function createAIProvider() {
    if (!env_1.env.OPENAI_API_KEY)
        return createRulesProvider();
    const openai = createOpenAIProvider();
    const rules = createRulesProvider();
    return {
        name: "openai",
        async generate(messages) {
            try {
                return await openai.generate(messages);
            }
            catch {
                return await rules.generate(messages);
            }
        },
    };
}
function isExternalAIEnabled() {
    return Boolean(env_1.env.OPENAI_API_KEY);
}
