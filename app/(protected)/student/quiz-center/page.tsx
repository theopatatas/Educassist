"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import { Clock, ChevronDown, ChevronRight, X, Calendar, Users } from "lucide-react";

type AttemptStatus = "Not Started" | "In Progress" | "Submitted";

type QuizItem = {
  id: number;
  title: string;
  date: string;
  myAttempt: AttemptStatus;
  publishResults: boolean;
  myScore: number;
  classAvg: number;
  color: string;
  questions: number;
  timeLimit: string;
  subjectName: string;
  className: string;
  teacherName: string;
  myCorrectAnswers: number;
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
  teacherName?: string | null;
  myAttempt?: AttemptStatus;
  publishResults?: boolean;
  myScore?: number;
  myCorrectAnswers?: number;
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
    publishResults: Boolean(q.publishResults),
    myScore: Number(q.myScore ?? 0),
    classAvg: 0,
    color: q.color || "blue",
    subjectName: q.subjectName || "Subject",
    className: q.sectionName || "Class",
    teacherName: q.teacherName || "Teacher",
    myCorrectAnswers: Number(q.myCorrectAnswers ?? 0),
  };
}

function getActionLabel(quiz: QuizItem) {
  if (quiz.publishResults) {
    return quiz.myAttempt === "Submitted" ? "View Score" : "Quiz Closed";
  }
  return "Start Quiz";
}

function canOpenQuiz(quiz: QuizItem) {
  return !quiz.publishResults || quiz.myAttempt === "Submitted";
}

export default function StudentQuizCenterPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");

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
  const subjectOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const quiz of quizzes) {
      if (quiz.subjectName.trim()) uniq.add(quiz.subjectName.trim());
    }
    return ["All Subjects", ...Array.from(uniq)];
  }, [quizzes]);
  const filteredQuizzes = useMemo(() => {
    if (selectedSubject === "All Subjects") return quizzes;
    return quizzes.filter((quiz) => quiz.subjectName === selectedSubject);
  }, [quizzes, selectedSubject]);

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

        <div className="relative w-full md:w-[220px]">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="h-11 w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 pr-11 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-indigo-100"
            aria-label="Filter quizzes by subject"
          >
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading quizzes...</div> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} onClick={() => setSelectedQuiz(quiz)} className="group cursor-pointer rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getColor(quiz.color)}`}>
                {quiz.subjectName}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${attemptPill(quiz.myAttempt)}`}>
                {quiz.myAttempt}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 transition-colors group-hover:text-indigo-600">{quiz.title}</h3>

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-gray-400" />
                <span>
                  {quiz.className} • {quiz.teacherName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{quiz.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{quiz.timeLimit}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                  %
                </span>
                <span>
                  {quiz.myCorrectAnswers}/{quiz.questions} ({quiz.myScore}%)
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <button
                type="button"
                disabled={!canOpenQuiz(quiz)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canOpenQuiz(quiz)) return;
                  router.push(`/student/quiz-center/${quiz.id}`);
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold ${
                  canOpenQuiz(quiz)
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                    : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500"
                }`}
              >
                {getActionLabel(quiz)}
                {canOpenQuiz(quiz) ? <ChevronRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && filteredQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSubject === "All Subjects" ? "No quizzes assigned yet." : "No quizzes for the selected subject."}
        </div>
      ) : null}

      {selectedQuiz ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedQuiz(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{selectedQuiz.subjectName}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" /> {selectedQuiz.date}
                  </span>
                  <span className={`rounded-lg px-2 py-1 text-xs font-bold ${attemptPill(selectedQuiz.myAttempt)}`}>{selectedQuiz.myAttempt}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedQuiz.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedQuiz.className} • {selectedQuiz.teacherName} • {selectedQuiz.questions} Questions • {selectedQuiz.timeLimit}
                </p>
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
                  <p className="text-3xl font-bold text-orange-900">
                    {selectedQuiz.publishResults && selectedQuiz.myAttempt !== "Submitted"
                      ? "Closed"
                      : selectedQuiz.myAttempt === "Submitted"
                      ? "Done"
                      : selectedQuiz.myAttempt === "In Progress"
                      ? "Ongoing"
                      : "Pending"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={!canOpenQuiz(selectedQuiz)}
                  onClick={() => {
                    if (!canOpenQuiz(selectedQuiz)) return;
                    router.push(`/student/quiz-center/${selectedQuiz.id}`);
                  }}
                  className={`flex-1 rounded-xl py-2.5 font-semibold ${
                    canOpenQuiz(selectedQuiz)
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                      : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500"
                  }`}
                >
                  {getActionLabel(selectedQuiz)}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
