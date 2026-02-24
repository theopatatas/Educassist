"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { Clock, ChevronRight, BarChart2, X, Calendar } from "lucide-react";

type AttemptStatus = "Not Started" | "In Progress" | "Submitted";

type QuizItem = {
  id: number;
  title: string;
  date: string;
  myAttempt: AttemptStatus;
  myScore: number;
  classAvg: number;
  color: string;
  questions: number;
  timeLimit: string;
  subjectName: string;
  className: string;
};

type ApiQuiz = {
  id: number;
  title: string;
  dueDate?: string | null;
  questions?: number;
  timeLimit?: number | null;
  color?: string;
  subjectName?: string | null;
  sectionName?: string | null;
  myAttempt?: AttemptStatus;
  myScore?: number;
};

const getColor = (color: string) => {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-600 border-green-200",
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200",
  };
  return colors[color] || colors.blue;
};

const attemptPill = (status: AttemptStatus) => {
  if (status === "Submitted") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
};

function mapQuiz(q: ApiQuiz): QuizItem {
  return {
    id: Number(q.id),
    title: q.title,
    date: q.dueDate || "No due date",
    questions: Number(q.questions ?? 0),
    timeLimit: q.timeLimit ? `${q.timeLimit} mins` : "No limit",
    myAttempt: q.myAttempt || "Not Started",
    myScore: Number(q.myScore ?? 0),
    classAvg: 0,
    color: q.color || "blue",
    subjectName: q.subjectName || "Subject",
    className: q.sectionName || "Class",
  };
}

export default function StudentQuizCenterPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/api/quizzes/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.quizzes) ? (data.quizzes as ApiQuiz[]) : [];
        setQuizzes(rows.map(mapQuiz));
      })
      .catch(() => {
        if (active) setLoadError("Failed to load quizzes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const submitted = quizzes.filter((q) => q.myAttempt === "Submitted").length;
    const inProgress = quizzes.filter((q) => q.myAttempt === "In Progress").length;
    const pending = quizzes.filter((q) => q.myAttempt === "Not Started").length;
    return { submitted, inProgress, pending };
  }, [quizzes]);

  const startOrResume = async (id: number) => {
    try {
      await api.post(`/api/quizzes/${id}/start`);
      setQuizzes((prev) =>
        prev.map((q) => (q.id === id && q.myAttempt === "Not Started" ? { ...q, myAttempt: "In Progress" } : q))
      );
      setSelectedQuiz((prev) => (prev && prev.id === id && prev.myAttempt === "Not Started" ? { ...prev, myAttempt: "In Progress" } : prev));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to start quiz.";
      setLoadError(message);
    }
  };

  const submitQuiz = async (id: number) => {
    const current = quizzes.find((q) => q.id === id);
    const score = current?.myScore && current.myScore > 0 ? current.myScore : 80;
    try {
      await api.post(`/api/quizzes/${id}/submit`, { score });
      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                myAttempt: "Submitted",
                myScore: score,
              }
            : q
        )
      );
      setSelectedQuiz((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              myAttempt: "Submitted",
              myScore: score,
            }
          : prev
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit quiz.";
      setLoadError(message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {loadError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      ) : null}

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Quizzes</h1>
          <p className="text-gray-500">Quizzes assigned by your teachers</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Submitted: {stats.submitted}</span>
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">In Progress: {stats.inProgress}</span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">Not Started: {stats.pending}</span>
          </div>
        </div>
      </div>

      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading quizzes...</div> : null}

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div key={quiz.id} onClick={() => setSelectedQuiz(quiz)} className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl border text-xs font-bold ${getColor(quiz.color)}`}>
                {quiz.myAttempt === "Submitted" ? (
                  <>
                    <div className="text-xl leading-none">{quiz.myScore}%</div>
                    <div className="mt-0.5 opacity-80">My score</div>
                  </>
                ) : (
                  <div className="px-2 text-center text-[11px] leading-tight">{quiz.myAttempt}</div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="mb-1 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{quiz.subjectName}</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{quiz.className}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" /> {quiz.date}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${attemptPill(quiz.myAttempt)}`}>{quiz.myAttempt}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-800 transition-colors group-hover:text-indigo-600">{quiz.title}</h3>

                <p className="mt-1 text-xs text-gray-500">{quiz.questions} Questions - {quiz.timeLimit} - Class Avg {quiz.classAvg}%</p>
              </div>

              <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-end">
                <div className="text-center">
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-400">My Progress</p>

                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${quiz.myAttempt === "Submitted" ? "bg-green-500" : quiz.myAttempt === "In Progress" ? "bg-amber-500" : "bg-gray-300"}`}
                        style={{ width: quiz.myAttempt === "Submitted" ? "100%" : quiz.myAttempt === "In Progress" ? "55%" : "15%" }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{quiz.myAttempt === "Submitted" ? "Done" : quiz.myAttempt === "In Progress" ? "55%" : "-"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedQuiz(quiz); }} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600" title="View details">
                    <BarChart2 className="h-5 w-5" />
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); startOrResume(quiz.id); }} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600" title="Start / Resume">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && quizzes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">No quizzes assigned yet.</div>
      ) : null}

      {selectedQuiz ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedQuiz(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{selectedQuiz.subjectName}</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{selectedQuiz.className}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" /> {selectedQuiz.date}
                  </span>
                  <span className={`rounded-lg px-2 py-1 text-xs font-bold ${attemptPill(selectedQuiz.myAttempt)}`}>{selectedQuiz.myAttempt}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedQuiz.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{selectedQuiz.questions} Questions - {selectedQuiz.timeLimit}</p>
              </div>

              <button onClick={() => setSelectedQuiz(null)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-xs font-bold uppercase text-indigo-600">My Score</p>
                  <p className="text-3xl font-bold text-indigo-900">{selectedQuiz.myAttempt === "Submitted" ? `${selectedQuiz.myScore}%` : "-"}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <p className="text-xs font-bold uppercase text-green-600">Class Average</p>
                  <p className="text-3xl font-bold text-green-900">{selectedQuiz.classAvg}%</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase text-orange-600">Attempt Status</p>
                  <p className="text-3xl font-bold text-orange-900">{selectedQuiz.myAttempt === "Submitted" ? "Done" : selectedQuiz.myAttempt === "In Progress" ? "Ongoing" : "Pending"}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => startOrResume(selectedQuiz.id)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
                  Start / Resume Quiz
                </button>
                <button onClick={() => submitQuiz(selectedQuiz.id)} className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                  Submit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
