"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Overview = {
  users: number;
  teachers: number;
  students: number;
  parents: number;
  enrolledStudents: number;
};
type StudentLite = { id: number; yearLevel?: string | null };

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview>({
    users: 0,
    teachers: 0,
    students: 0,
    parents: 0,
    enrolledStudents: 0,
  });
  const [gradeDistribution, setGradeDistribution] = useState<Array<{ label: string; count: number }>>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    let active = true;
    api
      .get("/api/admin/overview")
      .then(({ data }) => {
        if (!active) return;
        const next = data?.overview as Partial<Overview> | undefined;
        setOverview({
          users: Number(next?.users ?? 0),
          teachers: Number(next?.teachers ?? 0),
          students: Number(next?.students ?? 0),
          parents: Number(next?.parents ?? 0),
          enrolledStudents: Number(next?.enrolledStudents ?? 0),
        });
      })
      .catch(() => {
        if (!active) return;
        setOverview((prev) => ({ ...prev }));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/students")
      .then(({ data }) => {
        if (!active) return;
        const students = Array.isArray(data?.students) ? (data.students as StudentLite[]) : [];
        const counts = new Map<string, number>();
        for (const student of students) {
          const label = student.yearLevel?.trim() || "Unassigned";
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        setGradeDistribution(
          Array.from(counts.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
        );
      })
      .catch(() => {
        if (!active) return;
        setGradeDistribution([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalGrades = gradeDistribution.reduce((sum, item) => sum + item.count, 0);
  const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316"];
  const pieBackground = (() => {
    if (!totalGrades) return "#e2e8f0";
    let start = 0;
    const slices = gradeDistribution.map((item, index) => {
      const size = (item.count / totalGrades) * 100;
      const end = start + size;
      const color = pieColors[index % pieColors.length];
      const segment = `${color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${slices.join(", ")})`;
  })();
  const monthLabel = useMemo(
    () =>
      calendarDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [calendarDate]
  );
  const daysInMonth = useMemo(
    () => new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate(),
    [calendarDate]
  );
  const firstDay = useMemo(
    () => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay(),
    [calendarDate]
  );
  const calendarDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const emptyDays = useMemo(() => Array.from({ length: firstDay }), [firstDay]);
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    calendarDate.getMonth() === today.getMonth() &&
    calendarDate.getFullYear() === today.getFullYear();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">Overview of users, classes, and reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: overview.users },
          { label: "Active Teachers", value: overview.teachers },
          { label: "Active Students", value: overview.students },
          { label: "Enrolled Students", value: overview.enrolledStudents },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white p-6">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
          <p className="mt-1 text-sm text-slate-500">Student Distribution by Grade</p>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-44 w-44 sm:mx-0">
              <div className="h-full w-full rounded-full" style={{ background: pieBackground }} />
              <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white text-center">
                <div>
                  <p className="text-xs font-medium text-slate-500">Students</p>
                  <p className="text-xl font-semibold text-slate-900">{totalGrades}</p>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {gradeDistribution.length === 0 ? (
                <p className="text-sm text-slate-500">No grade data yet.</p>
              ) : (
                gradeDistribution.map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: pieColors[index % pieColors.length] }}
                      />
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">Event Calendar</h3>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() =>
                  setCalendarDate((prev) => {
                    const next = new Date(prev);
                    next.setMonth(next.getMonth() - 1);
                    return next;
                  })
                }
                className="rounded-md p-1.5 text-slate-500 hover:bg-white"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[130px] text-center text-sm font-medium text-slate-700">{monthLabel}</span>
              <button
                type="button"
                onClick={() =>
                  setCalendarDate((prev) => {
                    const next = new Date(prev);
                    next.setMonth(next.getMonth() + 1);
                    return next;
                  })
                }
                className="rounded-md p-1.5 text-slate-500 hover:bg-white"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 border border-slate-200 text-center text-xs font-semibold uppercase text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="border-b border-r border-slate-200 bg-slate-50 py-2 last:border-r-0">
                {day}
              </div>
            ))}

            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[58px] border-b border-r border-slate-100 bg-white" />
            ))}

            {calendarDays.map((day) => (
              <div
                key={day}
                className={`min-h-[58px] border-b border-r border-slate-100 p-2 text-left text-sm font-medium ${
                  isToday(day) ? "bg-blue-50 text-blue-700" : "text-slate-700"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">Event markers can be added here once admin event data is available.</p>
        </div>
      </div>
    </div>
  );
}
