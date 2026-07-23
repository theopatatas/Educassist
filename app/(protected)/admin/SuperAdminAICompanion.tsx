"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { api } from "@/src/lib/http/client";

type ChatMessage = { role: "user" | "assistant"; text: string };

function ChatGPTMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M128 24c-18.6 0-35.7 7.8-47.8 20.4-5.2 5.4-9.4 11.6-12.4 18.3-16.7 3.3-31.1 14.2-39.2 29.1-9.6 17.7-8.6 39.1 1.2 55.6-4.6 16.4-2.4 34.6 8 49.4 10.4 14.8 27.7 23.5 45.6 23.5.8 0 1.6 0 2.4-.1 12.4 11.6 29 18.8 47.4 18.8 18.6 0 35.7-7.8 47.8-20.4 5.2-5.4 9.4-11.6 12.4-18.3 16.7-3.3 31.1-14.2 39.2-29.1 9.6-17.7 8.6-39.1-1.2-55.6 4.6-16.4 2.4-34.6-8-49.4-10.4-14.8-27.7-23.5-45.6-23.5-.8 0-1.6 0-2.4.1C163 31.2 146.4 24 128 24Z"
      />
    </svg>
  );
}

export default function SuperAdminAICompanion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I am your AI companion. Ask me about LMS administration, reports, users, or school operations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || sending) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: prompt }]);
    setSending(true);
    try {
      const { data } = await api.post("/api/ai/chat", { prompt });
      const text =
        String(data?.text ?? "").trim() ||
        "I could not generate a response right now.";
      setMessages((current) => [...current, { role: "assistant", text }]);
    } catch (error) {
      const value = error as { response?: { data?: { message?: string } } };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            value.response?.data?.message ||
            "AI is unavailable right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI Companion"
        aria-label="Open AI Companion"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-gray-900"
      >
        <ChatGPTMark className="h-6 w-6" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex h-[min(600px,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <header className="flex items-center justify-between bg-gray-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <ChatGPTMark />
                </span>
                <div>
                  <h3 className="font-bold">AI Companion</h3>
                  <p className="text-xs text-white/70">
                    LMS administration assistance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${message.role === "user" ? "rounded-tr-none bg-indigo-600 text-white" : "rounded-tl-none border border-gray-100 bg-white text-gray-800 shadow-sm"}`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {sending ? (
                <p className="text-sm text-gray-500">AI is responding…</p>
              ) : null}
            </div>
            <form
              onSubmit={send}
              className="flex gap-2 border-t border-gray-100 bg-white p-4"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask something..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
