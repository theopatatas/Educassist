"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { FileText, Calendar, X, Clock, Users } from "lucide-react";

type ExamStatus = "Scheduled" | "Completed" | "Drafting";

type ApiExam = {
  id: number;
  title: string;
  examDate: string;
  startTime?: string | null;
  duration: string;
  status: ExamStatus;
  room: string | null;
  color?: string;
  subjectName?: string | null;
  sectionName?: string | null;
  teacherName?: string | null;
  coverage?: string[];
};

type ExamItem = {
  id: number;
  subject: string;
  title: string;
  date: string;
  startTime: string;
  duration: string;
  status: ExamStatus;
  color: string;
  room: string;
  coverage: string[];
  teacher: string;
  section: string;
  myStatus: string;
  reminderEnabled: boolean;
};

const statusPill = (status: ExamStatus) => {
  if (status === "Scheduled") return "bg-amber-100 text-amber-700";
  if (status === "Completed") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
};

function mapApiExamToItem(exam: ApiExam): ExamItem {
  const cleanCoverage = (Array.isArray(exam.coverage) ? exam.coverage : []).filter(
    (item) => String(item).trim().toLowerCase() !== "set coverage topics here"
  );
  return {
    id: Number(exam.id),
    subject: exam.subjectName || "Subject",
    title: exam.title,
    date: exam.examDate,
    startTime: exam.startTime || "",
    duration: exam.duration,
    status: exam.status,
    color: exam.color || "bg-blue-500",
    room: exam.room || "TBA",
    coverage: cleanCoverage,
    teacher: exam.teacherName || "Teacher",
    section: exam.sectionName || "Section",
    myStatus: exam.status === "Completed" ? "Completed" : "Planned",
    reminderEnabled: true,
  };
}

export default function StudentExamHallPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const toggleReminder = (id: number) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, reminderEnabled: !e.reminderEnabled } : e)));
    setSelectedExam((prev) => (prev && prev.id === id ? { ...prev, reminderEnabled: !prev.reminderEnabled } : prev));
  };

  const markAsCompleted = (id: number) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, status: "Completed", myStatus: "Completed" } : e)));
    setSelectedExam((prev) => (prev && prev.id === id ? { ...prev, status: "Completed", myStatus: "Completed" } : prev));
  };

  useEffect(() => {
    let active = true;

    api
      .get("/api/exams/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.exams) ? (data.exams as ApiExam[]) : [];
        setExams(rows.map(mapApiExamToItem));
      })
      .catch(() => {
        if (active) setLoadError("Failed to load exams.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const upcomingCount = useMemo(() => exams.filter((e) => e.status === "Scheduled").length, [exams]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Exams</h1>
          <p className="text-gray-500">See your exam schedule and track your preparation</p>
          <p className="mt-2 text-sm text-gray-500">
            Upcoming exams: <span className="font-semibold text-gray-700">{upcomingCount}</span>
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading exams...</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg"
            onClick={() => setSelectedExam(exam)}
          >
            <div className={`h-3 ${exam.color}`} />
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${exam.color}`}>{exam.subject}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusPill(exam.status)}`}>{exam.status}</span>
              </div>

              <h3 className="mb-2 text-xl font-bold text-gray-800">{exam.title}</h3>
              <p className="mb-3 text-sm text-gray-500">{exam.section} • {exam.teacher}</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{exam.date}{exam.startTime ? ` • ${exam.startTime}` : ""}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{exam.duration}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>Prep: {exam.myStatus}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReminder(exam.id);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    exam.reminderEnabled ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {exam.reminderEnabled ? "Reminder On" : "Reminder Off"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedExam(exam);
                  }}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && exams.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">No exams scheduled yet.</div>
      ) : null}

      {selectedExam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedExam(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className={`h-4 ${selectedExam.color}`} />
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500">{selectedExam.subject} • {selectedExam.section}</span>
                  <h2 className="mt-1 text-2xl font-bold text-gray-800">{selectedExam.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">Teacher: {selectedExam.teacher}</p>
                </div>

                <button onClick={() => setSelectedExam(null)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Date</p>
                      <p className="font-medium text-gray-800">
                        {selectedExam.date}
                        {selectedExam.startTime ? ` • ${selectedExam.startTime}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Duration</p>
                      <p className="font-medium text-gray-800">{selectedExam.duration}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Location</p>
                      <p className="font-medium text-gray-800">{selectedExam.room}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Status</p>
                      <p className="font-medium text-gray-800">{selectedExam.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Coverage</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                  {(selectedExam.coverage || []).length ? (
                    (selectedExam.coverage || []).map((c) => <li key={c}>{c}</li>)
                  ) : (
                    <li>No coverage provided yet.</li>
                  )}
                </ul>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setSelectedExam(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                  Close
                </button>

                <button onClick={() => markAsCompleted(selectedExam.id)} className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700">
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
