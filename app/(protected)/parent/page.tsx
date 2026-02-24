"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
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
  grades: { average: number; publishedCount: number };
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
