"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  X,
  Paperclip,
  Download,
  Upload,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

type Status = "To Do" | "Submitted" | "Graded" | "Missing";

type Attachment = {
  name: string;
  size: string;
};

type AssignmentItem = {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  status: Status;
  score: number | null;
  maxScore: number;
  teacherNote: string;
  color: "green" | "blue" | "purple";
  attachments: Attachment[];
  section?: string;
  teacherName?: string;
};

type ApiAssignment = {
  id: number;
  title: string;
  dueDate: string;
  status: "Active" | "Closed";
  mySubmitted?: boolean;
  description?: string | null;
  subjectName?: string | null;
  sectionName?: string | null;
  teacherName?: string | null;
  color?: "green" | "blue" | "purple" | "orange";
};

const initialAssignments: AssignmentItem[] = [];

const subjectTone: Record<AssignmentItem["color"], string> = {
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
};

const topBarTone: Record<AssignmentItem["color"], string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

function isOverdue(dueDate: string, status: Status) {
  if (status === "Submitted" || status === "Graded") return false;
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export default function StudentAssignmentPage() {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<"All" | string>("All");
  const [selectedStatus, setSelectedStatus] = useState<"All" | Status>("All");

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const subjectOk = selectedSubject === "All" || a.subject === selectedSubject;
      const statusOk = selectedStatus === "All" || a.status === selectedStatus;
      return subjectOk && statusOk;
    });
  }, [assignments, selectedSubject, selectedStatus]);

  const stats = useMemo(() => {
    const todo = assignments.filter((a) => a.status === "To Do" && !isOverdue(a.dueDate, a.status)).length;
    const missing = assignments.filter((a) => isOverdue(a.dueDate, a.status) || a.status === "Missing").length;
    const submitted = assignments.filter((a) => a.status === "Submitted").length;
    const graded = assignments.filter((a) => a.status === "Graded").length;
    const total = assignments.length;
    const done = submitted + graded;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, missing, submitted, graded, total, completionRate };
  }, [assignments]);

  const markSubmitted = (id: number) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Submitted" as Status } : a)));
    if (selectedAssignment?.id === id) setSelectedAssignment((prev) => (prev ? { ...prev, status: "Submitted" } : prev));
  };

  const statusPill = (a: AssignmentItem) => {
    const overdue = isOverdue(a.dueDate, a.status);
    if (overdue) return "bg-red-100 text-red-700";
    if (a.status === "To Do") return "bg-amber-100 text-amber-700";
    if (a.status === "Submitted") return "bg-indigo-100 text-indigo-700";
    if (a.status === "Graded") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  useEffect(() => {
    let active = true;

    api
      .get("/api/assignments/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.assignments) ? (data.assignments as ApiAssignment[]) : [];
        const mapped: AssignmentItem[] = rows.map((a) => ({
          id: Number(a.id),
          title: a.title,
          subject: a.subjectName || "Subject",
          dueDate: a.dueDate,
          status: a.mySubmitted ? "Submitted" : a.status === "Closed" ? "Missing" : "To Do",
          score: null,
          maxScore: 100,
          teacherNote: a.description || "",
          color: a.color === "green" || a.color === "blue" || a.color === "purple" ? a.color : "blue",
          attachments: [],
          section: a.sectionName || "Section",
          teacherName: a.teacherName || "Teacher",
        }));
        setAssignments(mapped);
      })
      .catch(() => {
        if (active) {
          setAssignments([]);
          setLoadError("Failed to load assignments.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submitAssignment = async (id: number) => {
    try {
      await api.post(`/api/assignments/${id}/submit`);
      markSubmitted(id);
    } catch {
      setLoadError("Failed to submit assignment.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Assignments</h1>
          <p className="text-gray-500">View tasks, due dates, and your submissions</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">To Do: {stats.todo}</span>
          <span className="rounded-full border bg-red-50 px-3 py-1 text-sm font-medium text-red-700">Missing: {stats.missing}</span>
          <span className="rounded-full border bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">Submitted: {stats.submitted}</span>
          <span className="rounded-full border bg-green-50 px-3 py-1 text-sm font-medium text-green-700">Graded: {stats.graded}</span>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading assignments...</div> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">To Do</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-700">
            <Clock className="h-5 w-5" />
            {stats.todo}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Missing</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {stats.missing}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Submitted</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{stats.submitted}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Completion</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-green-700">
            <BarChart3 className="h-5 w-5" />
            {stats.completionRate}%
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Subjects</option>
          {[...new Set(assignments.map((a) => a.subject))].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as Status | "All")}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Status</option>
          <option value="To Do">To Do</option>
          <option value="Submitted">Submitted</option>
          <option value="Graded">Graded</option>
          <option value="Missing">Missing</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssignments.map((assignment) => {
          const overdue = isOverdue(assignment.dueDate, assignment.status);
          return (
            <div
              key={assignment.id}
              onClick={() => setSelectedAssignment(assignment)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className={`h-2 w-full ${topBarTone[assignment.color]}`} />

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${subjectTone[assignment.color]}`}>
                    {assignment.subject}
                  </span>

                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusPill(assignment)}`}>
                    {overdue ? "Overdue" : assignment.status}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-bold text-gray-800 transition-colors group-hover:text-indigo-600">
                  {assignment.title}
                </h3>
                <p className="mb-2 text-xs text-gray-500">{assignment.subject} • {assignment.section}</p>

                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Due {assignment.dueDate}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">My Status</span>
                    <span className="font-bold text-gray-700">{overdue ? "Overdue" : assignment.status}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Score</span>
                    <span className="font-bold text-gray-700">
                      {assignment.score == null ? "-" : `${assignment.score}/${assignment.maxScore}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedAssignment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <span className={`mb-2 inline-block rounded-lg px-2 py-1 text-xs font-bold ${subjectTone[selectedAssignment.color]}`}>
                  {selectedAssignment.subject}
                </span>
                <h2 className="text-2xl font-bold text-gray-800">{selectedAssignment.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedAssignment.subject} • {selectedAssignment.section} • {selectedAssignment.teacherName}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Due: {selectedAssignment.dueDate}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    Status: {isOverdue(selectedAssignment.dueDate, selectedAssignment.status) ? "Overdue" : selectedAssignment.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAssignment(null)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-bold uppercase text-gray-400">Instructions</p>
                <p className="text-sm text-gray-700">{selectedAssignment.teacherNote || "No instructions provided."}</p>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  Attachments
                </h3>
                <div className="space-y-2">
                  {selectedAssignment.attachments?.length ? (
                    selectedAssignment.attachments.map((att: Attachment, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{att.name}</p>
                          <p className="text-xs text-gray-500">{att.size}</p>
                        </div>
                        <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white hover:text-indigo-600">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No attachments.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-bold text-gray-800">My Submission</h3>

                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {selectedAssignment.status === "Graded" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : selectedAssignment.status === "Submitted" ? (
                        <Clock className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600" />
                      )}
                      <span>
                        Status:{" "}
                        <span className="font-semibold text-gray-800">
                          {isOverdue(selectedAssignment.dueDate, selectedAssignment.status)
                            ? "Overdue"
                            : selectedAssignment.status}
                        </span>
                      </span>
                    </div>

                    <span className="text-sm font-bold text-gray-800">
                      Score:{" "}
                      {selectedAssignment.score == null
                        ? "-"
                        : `${selectedAssignment.score}/${selectedAssignment.maxScore}`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4" />
                        Upload File
                    </button>

                    <button
                      type="button"
                      onClick={() => void submitAssignment(selectedAssignment.id)}
                      disabled={selectedAssignment.status === "Submitted" || selectedAssignment.status === "Graded"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Mark as Submitted
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Note: Upload and download actions are not available yet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && assignments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          No assignments yet.
        </div>
      ) : null}
    </div>
  );
}
