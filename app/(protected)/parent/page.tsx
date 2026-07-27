"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import AcademicDashboardBadges from "../AcademicDashboardBadges";
import ParentEventCalendar from "./ParentEventCalendar";
import {
  CalendarCheck2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Moon,
  NotebookText,
  Sun,
  Sunset,
  UserRound,
} from "lucide-react";
import { useParentStudent } from "./ParentStudentContext";

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

function getTimeGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ParentHome() {
  const {
    selectedStudent,
    selectedStudentId,
    loading: studentsLoading,
    error: studentsError,
  } = useParentStudent();
  const [overview, setOverview] = useState<ParentOverview>(emptyOverview);
  const [parentName, setParentName] = useState("Parent");
  const [dashboardNow] = useState(() => Date.now());
  const currentHour = new Date(dashboardNow).getHours();
  const greeting = getTimeGreeting(currentHour);
  const GreetingIcon =
    currentHour < 12 ? Sun : currentHour < 18 ? Sunset : Moon;
  const [isLoading, setIsLoading] = useState(true);
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AcademicSession | null>(null);
  const [academicRecords, setAcademicRecords] = useState<AcademicSubjectRecord[]>([]);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [academicError, setAcademicError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/api/parents/me")
      .then(({ data }) => {
        if (!active) return;
        const name = [
          String(data?.parent?.firstName ?? "").trim(),
          String(data?.parent?.lastName ?? "").trim(),
        ]
          .filter(Boolean)
          .join(" ");
        setParentName(name || "Parent");
      })
      .catch(() => {
        if (active) setParentName("Parent");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      if (!studentsLoading) {
        setOverview(emptyOverview);
        setIsLoading(false);
      }
      return;
    }
    let active = true;
    setIsLoading(true);
    api
      .get("/api/parents/overview", {
        params: { studentId: selectedStudentId },
      })
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
  }, [selectedStudentId, studentsLoading]);

  useEffect(() => {
    if (!selectedStudentId) {
      if (!studentsLoading) {
        setAcademicSessions([]);
        setSelectedSession(null);
        setAcademicRecords([]);
        setAcademicLoading(false);
      }
      return;
    }
    let active = true;
    setAcademicLoading(true);
    setAcademicError("");
    Promise.all([
      api.get("/api/parents/academic-sessions", {
        params: { studentId: selectedStudentId },
      }),
      api.get("/api/parents/academic-record", {
        params: { studentId: selectedStudentId },
      }),
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
  }, [selectedStudentId, studentsLoading]);

  const loadAcademicSession = async (session: AcademicSession) => {
    if (academicLoading) return;
    setAcademicLoading(true);
    setAcademicError("");
    try {
      const { data } = await api.get("/api/parents/academic-record", {
        params: {
          studentId: selectedStudentId,
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
    if (!selectedStudent) return "No linked student";
    const grade = selectedStudent.gradeLevel
      ? ` • ${selectedStudent.gradeLevel}`
      : "";
    const section = selectedStudent.sectionName
      ? ` • ${selectedStudent.sectionName}`
      : "";
    return `${selectedStudent.name}${grade}${section}`;
  }, [selectedStudent]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            Welcome back, Parent
          </p>
          <h1
            suppressHydrationWarning
            className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {greeting}, {parentName}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Here is your selected student&apos;s learning overview for today.
          </p>
          <div className="mt-4">
            <AcademicDashboardBadges />
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600 shadow-sm sm:h-14 sm:w-14">
          <GreetingIcon className="h-7 w-7" />
        </div>
      </section>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
        <div className="rounded-xl bg-violet-50 p-3">
          <UserRound className="h-6 w-6 text-violet-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Currently Viewing</p>
          <p className="mt-1 break-words text-base font-bold text-slate-900 sm:text-lg">
            {linkedStudentText}
          </p>
        </div>
      </div>

      {studentsError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {studentsError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: "Attendance Rate",
            value: `${overview.attendance.rate}%`,
            icon: CalendarCheck2,
            bg: "bg-emerald-50",
            color: "text-emerald-600",
          },
          {
            label: "Quiz Submitted",
            value: overview.quizzes.submitted,
            icon: ClipboardList,
            bg: "bg-blue-50",
            color: "text-blue-600",
          },
          {
            label: "Quiz Average",
            value: `${overview.quizzes.averageScore}%`,
            icon: NotebookText,
            bg: "bg-indigo-50",
            color: "text-indigo-600",
          },
          {
            label: "Upcoming Exams",
            value: overview.exams.upcoming,
            icon: FileCheck2,
            bg: "bg-amber-50",
            color: "text-amber-600",
          },
          {
            label: "Grade Average",
            value: `${overview.grades.average}%`,
            icon: GraduationCap,
            bg: "bg-violet-50",
            color: "text-violet-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
            >
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-800">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 text-center min-[380px]:grid-cols-3">
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

      {selectedStudentId ? (
        <ParentEventCalendar key={selectedStudentId} />
      ) : !studentsLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-700">
            No linked student selected
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Link a student to view their calendar events.
          </p>
        </section>
      ) : null}

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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
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

        <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-slate-200 overscroll-x-contain">
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
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      className={`px-4 py-3 font-semibold ${
                        index === 0 ? "sticky left-0 bg-slate-50" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicRecords.map((record) => (
                  <tr key={record.subjectId} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-900">
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
        <div className="mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-xl">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 bg-slate-50 px-3 py-2">
                  Quarter
                </th>
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
                    <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-900">{row.quarter}</td>
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
