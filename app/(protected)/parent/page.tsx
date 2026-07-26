"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import AcademicDashboardBadges from "../AcademicDashboardBadges";
import ParentEventCalendar from "./ParentEventCalendar";
import { CalendarCheck2, ClipboardList, FileCheck2, GraduationCap, NotebookText, UserRound } from "lucide-react";

type ParentOverview = {
  linkedStudent: {
    id: number;
    name: string;
    gradeLevel: string | null;
    sectionId: number | null;
  } | null;
  attendance: { present: number; late: number; absent: number; rate: number };
  quizzes: { submitted: number; averageScore: number };
  exams: { upcoming: number; completed: number };
  grades: {
    average: number;
    publishedCount: number;
    finalSubjectAverages?: Record<string, number>;
    overallAverage?: number | null;
  };
  gradeTable: Array<{
    quarter: string;
    math: number;
    science: number;
    english: number;
    filipino: number;
    mapeh: number;
    ap: number;
    tle: number;
    values: number;
  }>;
};

type AcademicSession = {
  academicYear: string;
  gradeLevel: string;
  status: "Current" | "Completed";
};

type AcademicSubjectRecord = {
  subjectId: number;
  subjectName: string;
  subjectCode: string | null;
  quarter1: number | null;
  quarter2: number | null;
  quarter3: number | null;
  quarter4: number | null;
  finalGrade: number | null;
};

const emptyOverview: ParentOverview = {
  linkedStudent: null,
  attendance: { present: 0, late: 0, absent: 0, rate: 0 },
  quizzes: { submitted: 0, averageScore: 0 },
  exams: { upcoming: 0, completed: 0 },
  grades: { average: 0, publishedCount: 0 },
  gradeTable: [
    { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
  ],
};

export default function ParentHome() {
  const [overview, setOverview] = useState<ParentOverview>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AcademicSession | null>(null);
  const [academicRecords, setAcademicRecords] = useState<AcademicSubjectRecord[]>([]);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [academicError, setAcademicError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/api/parents/overview")
      .then(({ data }) => {
        if (!active) return;
        const next = data?.overview as ParentOverview | undefined;
        setOverview(next ?? emptyOverview);
      })
      .catch(() => {
        if (!active) return;
        setOverview(emptyOverview);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/parents/academic-sessions"),
      api.get("/api/parents/academic-record"),
    ])
      .then(([sessionsResponse, recordResponse]) => {
        if (!active) return;
        const sessions = Array.isArray(sessionsResponse.data?.sessions)
          ? (sessionsResponse.data.sessions as AcademicSession[])
          : [];
        setAcademicSessions(sessions);
        setSelectedSession(
          sessions.find((session) => session.status === "Current") ??
            sessions[0] ??
            null,
        );
        setAcademicRecords(
          Array.isArray(recordResponse.data?.record?.subjects)
            ? recordResponse.data.record.subjects
            : [],
        );
      })
      .catch(() => {
        if (active)
          setAcademicError("Academic sessions could not be loaded.");
      })
      .finally(() => {
        if (active) setAcademicLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadAcademicSession = async (session: AcademicSession) => {
    if (academicLoading) return;
    setAcademicLoading(true);
    setAcademicError("");
    try {
      const { data } = await api.get("/api/parents/academic-record", {
        params: {
          academicYear: session.academicYear,
          gradeLevel: session.gradeLevel,
        },
      });
      setAcademicRecords(
        Array.isArray(data?.record?.subjects) ? data.record.subjects : [],
      );
      setSelectedSession(session);
    } catch {
      setAcademicError("Academic records could not be loaded.");
    } finally {
      setAcademicLoading(false);
    }
  };

  const linkedStudentText = useMemo(() => {
    if (!overview.linkedStudent) return "No linked student";
    const grade = overview.linkedStudent.gradeLevel ? ` • ${overview.linkedStudent.gradeLevel}` : "";
    const section = overview.linkedStudent.sectionId ? ` • Section ${overview.linkedStudent.sectionId}` : "";
    return `${overview.linkedStudent.name}${grade}${section}`;
  }, [overview.linkedStudent]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parent Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Overview of your linked student progress.</p>
        <div className="mt-4">
          <AcademicDashboardBadges />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Student</p>
        <div className="mt-2 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-slate-500" />
          <p className="text-base font-semibold text-slate-900">{linkedStudentText}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance Rate</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CalendarCheck2 className="h-5 w-5 text-emerald-600" />
            {overview.attendance.rate}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiz Submitted</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            {overview.quizzes.submitted}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiz Average</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <NotebookText className="h-5 w-5 text-indigo-600" />
            {overview.quizzes.averageScore}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming Exams</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FileCheck2 className="h-5 w-5 text-amber-600" />
            {overview.exams.upcoming}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade Average</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <GraduationCap className="h-5 w-5 text-violet-600" />
            {overview.grades.average}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-green-100 bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase text-green-700">Present</p>
              <p className="mt-1 text-xl font-bold text-green-900">{overview.attendance.present}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Late</p>
              <p className="mt-1 text-xl font-bold text-amber-900">{overview.attendance.late}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase text-red-700">Absent</p>
              <p className="mt-1 text-xl font-bold text-red-900">{overview.attendance.absent}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Academic Overview</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Published Grades</span>
              <span className="text-sm font-semibold text-slate-900">{overview.grades.publishedCount}</span>
            </div>
            {overview.grades.overallAverage !== null &&
            overview.grades.overallAverage !== undefined ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <span className="text-sm text-indigo-700">Overall Average</span>
                <span className="text-sm font-bold text-indigo-900">
                  {overview.grades.overallAverage}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Completed Exams</span>
              <span className="text-sm font-semibold text-slate-900">{overview.exams.completed}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Quiz Submissions</span>
              <span className="text-sm font-semibold text-slate-900">{overview.quizzes.submitted}</span>
            </div>
          </div>
        </div>
      </div>

      <ParentEventCalendar />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Academic Sessions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View your linked student&apos;s current and previous published
              grades.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 text-sm font-medium text-slate-700 sm:min-w-80">
              Academic Session
              <select
                value={
                  selectedSession
                    ? `${selectedSession.academicYear}|${selectedSession.gradeLevel}`
                    : ""
                }
                onChange={(event) => {
                  const session = academicSessions.find(
                    (item) =>
                      `${item.academicYear}|${item.gradeLevel}` ===
                      event.target.value,
                  );
                  if (session) void loadAcademicSession(session);
                }}
                disabled={academicLoading || academicSessions.length === 0}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {academicSessions.length === 0 ? (
                  <option value="">No academic sessions available</option>
                ) : null}
                {academicSessions.map((session) => (
                  <option
                    key={`${session.academicYear}|${session.gradeLevel}`}
                    value={`${session.academicYear}|${session.gradeLevel}`}
                  >
                    {session.gradeLevel} • Academic Year {session.academicYear}
                  </option>
                ))}
              </select>
            </label>
            {selectedSession ? (
              <span
                className={`mb-0.5 inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-medium ${
                  selectedSession.status === "Current"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {selectedSession.status}
              </span>
            ) : null}
          </div>
        </div>

        {academicError ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {academicError}
          </p>
        ) : null}

        {academicSessions.length > 0 &&
        !academicSessions.some((session) => session.status === "Completed") ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No previous academic sessions found.
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          {academicLoading ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Loading academic records…
            </p>
          ) : academicRecords.length ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Subject",
                    "Code",
                    "Quarter 1",
                    "Quarter 2",
                    "Quarter 3",
                    "Quarter 4",
                    "Final Grade",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicRecords.map((record) => (
                  <tr key={record.subjectId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {record.subjectName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {record.subjectCode || "—"}
                    </td>
                    {[
                      record.quarter1,
                      record.quarter2,
                      record.quarter3,
                      record.quarter4,
                      record.finalGrade,
                    ].map((grade, index) => (
                      <td key={index} className="px-4 py-3 text-slate-700">
                        {grade ?? "Not submitted"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">
              No published grades are available for this academic session.
            </p>
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Student Grades</h2>
        <p className="mt-1 text-sm text-slate-500">Published grades by quarter</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Quarter</th>
                <th className="px-3 py-2">Math</th>
                <th className="px-3 py-2">Science</th>
                <th className="px-3 py-2">English</th>
                <th className="px-3 py-2">Filipino</th>
                <th className="px-3 py-2">MAPEH</th>
                <th className="px-3 py-2">AP</th>
                <th className="px-3 py-2">TLE</th>
                <th className="px-3 py-2">Values</th>
                <th className="px-3 py-2">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.gradeTable.map((row) => {
                const avg = Math.round((row.math + row.science + row.english + row.filipino + row.mapeh + row.ap + row.tle + row.values) / 8);
                return (
                  <tr key={row.quarter} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.quarter}</td>
                    <td className="px-3 py-2 text-slate-700">{row.math}</td>
                    <td className="px-3 py-2 text-slate-700">{row.science}</td>
                    <td className="px-3 py-2 text-slate-700">{row.english}</td>
                    <td className="px-3 py-2 text-slate-700">{row.filipino}</td>
                    <td className="px-3 py-2 text-slate-700">{row.mapeh}</td>
                    <td className="px-3 py-2 text-slate-700">{row.ap}</td>
                    <td className="px-3 py-2 text-slate-700">{row.tle}</td>
                    <td className="px-3 py-2 text-slate-700">{row.values}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{avg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Loading overview...</p> : null}
    </div>
  );
}
