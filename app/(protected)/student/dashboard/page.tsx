"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import {
  TrendingUp,
  Users,
  Clock,
  BookOpen,
  Star,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";

type SubjectProgress = {
  name: string;
  color: string;
  text: string;
  bg: string;
  units: number;
  avg: number;
};

type ApiClass = {
  id: number;
  subjectName?: string | null;
};

const calendarDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarEvent = {
  id: number;
  title: string;
  isoDate: string;
  date: number;
  time: string;
  location: string;
  type: "exam" | "quiz" | "deadline" | "club";
  color: string;
};
type ApiExam = {
  id: number;
  title: string;
  examDate: string;
  startTime?: string | null;
  duration: string;
  room?: string | null;
  subjectName?: string | null;
};

function getSchoolYearLabel(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 7 ? year : year - 1;
  const endYear = startYear + 1;
  return `SY ${startYear}-${endYear}`;
}

function getQuarterLabel(date = new Date()) {
  const m = date.getMonth();
  if (m >= 7 && m <= 9) return "Quarter 1";
  if (m === 10 || m === 11 || m === 0) return "Quarter 2";
  if (m >= 1 && m <= 3) return "Quarter 3";
  return "Quarter 4";
}

function ChatGPTMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M128 24c-18.6 0-35.7 7.8-47.8 20.4-5.2 5.4-9.4 11.6-12.4 18.3-16.7 3.3-31.1 14.2-39.2 29.1-9.6 17.7-8.6 39.1 1.2 55.6-4.6 16.4-2.4 34.6 8 49.4 10.4 14.8 27.7 23.5 45.6 23.5.8 0 1.6 0 2.4-.1 12.4 11.6 29 18.8 47.4 18.8 18.6 0 35.7-7.8 47.8-20.4 5.2-5.4 9.4-11.6 12.4-18.3 16.7-3.3 31.1-14.2 39.2-29.1 9.6-17.7 8.6-39.1-1.2-55.6 4.6-16.4 2.4-34.6-8-49.4-10.4-14.8-27.7-23.5-45.6-23.5-.8 0-1.6 0-2.4.1C163 31.2 146.4 24 128 24Z"
      />
    </svg>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const syLabel = getSchoolYearLabel();
  const quarterLabel = getQuarterLabel();
  const [showAiChat, setShowAiChat] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your AI companion. Ask me about homework, quizzes, or study tips." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const firstDay = useMemo(() => getFirstDayOfMonth(currentDate), [currentDate]);

  const blanks = useMemo(() => Array(firstDay).fill(null), [firstDay]);
  const monthDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentDate]
  );

  const changeMonth = (delta: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      currentDate.getMonth() === now.getMonth() &&
      currentDate.getFullYear() === now.getFullYear()
    );
  };

  const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);

  const classAverage = subjects.length ? `${Math.round(subjects.reduce((sum, subject) => sum + subject.avg, 0) / subjects.length)}%` : "0%";

  const stats = [
    { label: "My Subjects", value: subjects.length, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "My Average", value: classAverage, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { label: "Assignments Due", value: "0", icon: BookOpen, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Pending Tasks", value: "0", icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            userText.toLowerCase().includes("math")
              ? "For Math: try 10 practice items on quadratics, then review mistakes. Want a quick 5-item drill?"
              : userText.toLowerCase().includes("science")
              ? "For Science: make a 5-bullet summary of each key process, then do self-quiz. Want a reviewer outline?"
              : "Tell me the subject and what you are stuck on, and I will help you step-by-step.",
        },
      ]);
    }, 700);
  };

  useEffect(() => {
    if (!showAiChat) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showAiChat]);

  useEffect(() => {
    let active = true;
    api
      .get("/api/students/me")
      .then((res) => {
        if (!active) return;
        const s = res.data?.student;
        const name = [s?.firstName, s?.lastName].filter(Boolean).join(" ").trim();
        setStudentName(name || "Student");
      })
      .catch(() => {
        if (active) setStudentName("Student");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/exams/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.exams) ? (data.exams as ApiExam[]) : [];
        const mapped: CalendarEvent[] = rows.map((exam) => {
          const d = new Date(exam.examDate);
          const subject = (exam.subjectName || "").toLowerCase();
          const color = subject.includes("science")
            ? "bg-green-100 text-green-700 border-green-200"
            : subject.includes("math")
            ? "bg-blue-100 text-blue-700 border-blue-200"
            : subject.includes("english")
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : subject.includes("filipino")
            ? "bg-orange-100 text-orange-700 border-orange-200"
            : "bg-red-100 text-red-700 border-red-200";
          return {
            id: Number(exam.id),
            title: exam.title,
            isoDate: exam.examDate,
            date: d.getDate(),
            time: exam.startTime || exam.duration || "Exam",
            location: exam.room || "TBA",
            type: "exam",
            color,
          };
        });
        setEvents(mapped);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.classes) ? (data.classes as ApiClass[]) : [];
        const grouped = new Map<string, number>();
        for (const row of rows) {
          const name = row.subjectName?.trim();
          if (!name) continue;
          grouped.set(name, (grouped.get(name) ?? 0) + 1);
        }

        const palette = [
          { color: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-50" },
          { color: "bg-green-500", text: "text-green-500", bg: "bg-green-50" },
          { color: "bg-purple-500", text: "text-purple-500", bg: "bg-purple-50" },
          { color: "bg-orange-500", text: "text-orange-500", bg: "bg-orange-50" },
          { color: "bg-pink-500", text: "text-pink-500", bg: "bg-pink-50" },
          { color: "bg-teal-500", text: "text-teal-500", bg: "bg-teal-50" },
        ];

        const mapped: SubjectProgress[] = Array.from(grouped.entries()).map(([name, sections], i) => ({
          name,
          units: sections,
          avg: 0,
          ...palette[i % palette.length],
        }));

        setSubjects(mapped);
      })
      .catch(() => {
        if (active) setSubjects([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowAiChat(true)}
        title="AI Companion"
        aria-label="Open AI Companion"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black shadow-lg transition hover:bg-gray-900"
      >
        <span className="text-white">
          <ChatGPTMark className="h-6 w-6" />
        </span>
      </button>

      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {studentName || "Student"}</h1>
            <p className="text-gray-500">Here is your learning overview for today.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-white px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {syLabel}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-purple-50 to-white px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              {quarterLabel}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const isMySubjects = stat.label === "My Subjects";
                return (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={isMySubjects ? () => router.push("/student/classes") : undefined}
                    className={`flex w-full flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-md ${isMySubjects ? "transition hover:shadow-lg" : ""}`}
                  >
                    <div className={`rounded-xl p-3 ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                My Progress
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {subjects.map((subject) => (
                  <div key={subject.name} className="overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1">
                    <div className={`h-2 ${subject.color}`} />
                    <div className="p-6 text-center">
                      <div className="mb-4 flex flex-col items-center gap-2">
                        <h3 className="font-bold text-gray-800">{subject.name}</h3>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${subject.bg} ${subject.text}`}>
                          {subject.avg}% Avg
                        </span>
                      </div>

                      <div className="flex justify-center">
                        <div className="relative h-24 w-24">
                          <svg className="h-full w-full -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-gray-100"
                              stroke="currentColor"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={251.2}
                              strokeDashoffset={251.2 * (1 - subject.avg / 100)}
                              className={subject.text}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold">{subject.avg}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
                        <span>{subject.units} Units</span>
                        <span className="flex items-center gap-1 text-green-500">
                          <TrendingUp className="h-3 w-3" /> +2.4%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {subjects.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-md">
                  No subject progress data yet.
                </div>
              ) : null}

              <p className="mt-4 text-sm text-gray-500">
                Total enrolled units: <span className="font-semibold text-gray-700">{totalUnits}</span>
              </p>
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="bg-gray-50 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">My Calendar</h2>
                    <p className="text-xs text-gray-500">Classes, quizzes, deadlines, and activities</p>
                  </div>

                  <div className="flex items-center rounded-xl bg-white p-1 shadow-sm">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                      aria-label="Previous month"
                      type="button"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <span className="min-w-[120px] px-3 text-center text-sm font-bold text-gray-700">
                      {monthLabel}
                    </span>

                    <button
                      onClick={() => changeMonth(1)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                      aria-label="Next month"
                      type="button"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
                {calendarDays.map((day) => (
                  <div
                    key={day}
                    className="bg-gray-50 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid auto-rows-fr grid-cols-7">
                {blanks.map((_, i) => (
                  <div key={`blank-${i}`} className="bg-gray-50/30" />
                ))}

                {monthDays.map((day) => {
                  const dayEvents = events.filter((e) => {
                    const d = new Date(e.isoDate);
                    return (
                      d.getDate() === day &&
                      d.getMonth() === currentDate.getMonth() &&
                      d.getFullYear() === currentDate.getFullYear()
                    );
                  });
                return (
                    <div
                      key={day}
                      className="relative min-h-[90px] p-2 transition-colors hover:bg-gray-50"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          isToday(day) ? "bg-indigo-600 text-white" : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>

                      <div className="mt-2 space-y-1">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium ${event.color}`}
                            title={event.title}
                            type="button"
                          >
                            {event.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {events.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No calendar events yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />

          <div
            className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 bg-gray-50 p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
              <div>
                <span className={`inline-block rounded-lg border px-2 py-1 text-xs font-bold ${selectedEvent.color}`}>
                  {selectedEvent.type.toUpperCase()}
                </span>
                <h3 className="mt-2 text-xl font-bold text-gray-900">{selectedEvent.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close event"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{selectedEvent.time}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{selectedEvent.location}</span>
              </div>

              <div className="text-sm text-gray-500">Tip: Add a reminder on your phone so you do not miss it.</div>
            </div>

            <div className="flex justify-end bg-gray-50 p-5 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)]">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-xl px-4 py-2 text-sm shadow-sm hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showAiChat ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAiChat(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between bg-gray-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <ChatGPTMark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">AI Companion</h3>
                  <p className="text-xs text-white/70">Study help - tips - reviewers</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiChat(false)}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
                aria-label="Close chat"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      msg.role === "user"
                        ? "rounded-tr-none bg-indigo-600 text-white"
                        : "rounded-tl-none bg-white text-gray-800 shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 bg-white p-4 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
}
