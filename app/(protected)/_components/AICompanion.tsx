"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  History,
  Image as ImageIcon,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import TeacherAssistantPage from "../teacher/assistant/page";

type Message = {
  role: "user" | "assistant";
  text: string;
  attachments?: Array<{ name: string; type: string }>;
};
type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};
type AssistantMode = "chat" | "quiz" | "lesson";

function storageKey(userId: string | number | undefined) {
  return `educassist-ai-conversations:${String(userId ?? "anonymous")}`;
}

function newConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

export default function AICompanion() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [activeId, conversations],
  );
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    if (!user?.id) return;
    setHistoryLoaded(false);
    try {
      const parsed = JSON.parse(
        localStorage.getItem(storageKey(user.id)) || "[]",
      );
      const saved = Array.isArray(parsed) ? (parsed as Conversation[]) : [];
      setConversations(saved);
      setActiveId(saved[0]?.id ?? "");
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!historyLoaded || !user?.id) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(conversations));
  }, [conversations, historyLoaded, user?.id]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages, open, sending]);

  const startNewChat = () => {
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setAttachments([]);
    setAttachmentError("");
    setHistoryOpen(false);
  };

  const deleteConversation = (conversationId: string) => {
    const remaining = conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    setConversations(remaining);
    if (activeId === conversationId) {
      setActiveId(remaining[0]?.id ?? "");
      setInput("");
      setAttachments([]);
    }
  };

  const ensureConversation = () => {
    if (active) return active;
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    return conversation;
  };

  const addMessage = (conversationId: string, message: Message) => {
    setConversations((current) =>
      current
        .map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const messages = [...conversation.messages, message];
          const firstUserMessage = messages.find(
            (item) => item.role === "user",
          );
          return {
            ...conversation,
            messages,
            title: firstUserMessage
              ? firstUserMessage.text.slice(0, 42)
              : conversation.title,
            updatedAt: new Date().toISOString(),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if ((!prompt && !attachments.length) || sending) return;
    const conversation = ensureConversation();
    setInput("");
    const selectedAttachments = [...attachments];
    setAttachments([]);
    setAttachmentError("");
    addMessage(conversation.id, {
      role: "user",
      text: prompt || "Please analyze the attached material.",
      attachments: selectedAttachments.map((file) => ({
        name: file.name,
        type: file.type,
      })),
    });
    setSending(true);
    try {
      const response = selectedAttachments.length
        ? await api.post(
            "/api/ai/chat/attachments",
            (() => {
              const formData = new FormData();
              formData.append("prompt", prompt);
              selectedAttachments.forEach((file) =>
                formData.append("attachments", file),
              );
              return formData;
            })(),
          )
        : await api.post("/api/ai/chat", { prompt });
      const { data } = response;
      addMessage(conversation.id, {
        role: "assistant",
        text:
          String(data?.text ?? "").trim() ||
          "I could not generate a response right now.",
      });
    } catch (error) {
      const requestError = error as {
        response?: { data?: { message?: string } };
      };
      addMessage(conversation.id, {
        role: "assistant",
        text:
          requestError.response?.data?.message ||
          "AI is unavailable right now. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const selectAttachments = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const invalid = incoming.find(
      (file) => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setAttachmentError(
        `${invalid.name} is unsupported or larger than 10 MB.`,
      );
      return;
    }
    setAttachments((current) => {
      const combined = [...current, ...incoming];
      if (combined.length > 5) {
        setAttachmentError("You can attach up to 5 files at a time.");
        return current;
      }
      setAttachmentError("");
      return combined;
    });
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800"
        aria-label="Open AI Companion"
        title="AI Companion"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <section className="relative flex h-full w-full overflow-hidden bg-white shadow-2xl sm:h-[min(760px,calc(100vh-2rem))] sm:max-w-6xl sm:rounded-2xl">
            {mode === "chat" ? (
              <aside
                className={`${historyOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-20 w-[82%] max-w-72 flex-col border-r border-slate-800 bg-slate-950 p-3 text-white md:static md:flex`}
              >
              <button
                type="button"
                onClick={startNewChat}
                className="flex h-11 items-center gap-3 rounded-xl border border-white/15 px-3 text-sm font-medium transition hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                New chat
              </button>
              <div className="mt-6 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <History className="h-4 w-4" />
                Chat history
              </div>
              <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
                {conversations.length ? (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`group flex w-full items-center rounded-lg transition ${
                        activeId === conversation.id
                          ? "bg-white/15"
                          : "hover:bg-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(conversation.id);
                          setHistoryOpen(false);
                        }}
                        className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm"
                      >
                        {conversation.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteConversation(conversation.id)}
                        className="mr-1.5 rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                        aria-label={`Delete chat: ${conversation.title}`}
                        title="Delete chat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-slate-500">
                    No chat history yet.
                  </p>
                )}
              </div>
              </aside>
            ) : null}

            {historyOpen && mode === "chat" ? (
              <button
                type="button"
                className="absolute inset-0 z-10 bg-black/40 md:hidden"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close chat history"
              />
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col bg-white">
              <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  {mode === "chat" ? (
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(true)}
                      className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
                      aria-label="Open chat history"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  ) : null}
                  <h2 className="truncate font-semibold text-slate-900">
                    {mode === "chat"
                      ? "AI Companion"
                      : mode === "quiz"
                        ? "AI Quiz Generator"
                        : "AI Lesson Plan Generator"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close AI Companion"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {isTeacher ? (
                <nav className="grid shrink-0 grid-cols-3 gap-1 border-b border-slate-200 bg-white p-2">
                  {(
                    [
                      ["chat", "Regular AI"],
                      ["quiz", "Quiz"],
                      ["lesson", "Lesson Plan"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setMode(value);
                        setHistoryOpen(false);
                      }}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                        mode === value
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              ) : null}

              {mode === "chat" ? (
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {!active?.messages.length ? (
                  <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                      How can I help you today?
                    </h3>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
                    {active.messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`mb-6 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] whitespace-pre-wrap text-sm leading-7 sm:text-base ${message.role === "user" ? "rounded-3xl bg-slate-100 px-4 py-2.5 text-slate-900" : "text-slate-800"}`}
                        >
                          {message.text}
                          {message.attachments?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((attachment) => (
                                <span
                                  key={`${attachment.name}-${attachment.type}`}
                                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                >
                                  {attachment.type.startsWith("image/") ? (
                                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {attachment.name}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {sending ? (
                      <p className="text-sm text-slate-500">Thinking…</p>
                    ) : null}
                  </div>
                )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-slate-50">
                  <TeacherAssistantPage
                    key={mode}
                    embedded
                    initialTab={mode}
                  />
                </div>
              )}

              {mode === "chat" ? (
                <div className="px-3 pb-4 sm:px-6 sm:pb-6">
                {isTeacher && attachments.length ? (
                  <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <span
                        key={`${file.name}-${file.lastModified}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                      >
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="h-4 w-4 shrink-0 text-indigo-600" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
                        )}
                        <span className="max-w-40 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {isTeacher && attachmentError ? (
                  <p className="mx-auto mb-2 max-w-3xl text-sm text-rose-600">
                    {attachmentError}
                  </p>
                ) : null}
                <form
                  onSubmit={send}
                  className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 pl-4 shadow-lg"
                >
                  {isTeacher ? (
                    <>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json,.docx"
                        onChange={(event) =>
                          selectAttachments(event.target.files)
                        }
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={sending}
                        className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                        aria-label="Attach a file or photo"
                        title="Attach file or photo"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Message AI Companion"
                    className="max-h-36 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !attachments.length) || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
