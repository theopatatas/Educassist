"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/src/lib/http/client";

type StudentRow = {
  id: number;
  lrn: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  yearLevel?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;
  createdAt?: string;
};

type StudentOverview = {
  student: {
    id: number;
    name: string;
    gradeLevel: string | null;
    sectionId: number | null;
  };
  attendance: { present: number; late: number; absent: number; rate: number };
  subjects: string[];
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

const emptyStudentOverview: StudentOverview = {
  student: {
    id: 0,
    name: "",
    gradeLevel: null,
    sectionId: null,
  },
  attendance: { present: 0, late: 0, absent: 0, rate: 0 },
  subjects: [],
  gradeTable: [
    { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
  ],
};

const SUBJECT_TO_KEY: Record<string, keyof StudentOverview["gradeTable"][number]> = {
  math: "math",
  mathematics: "math",
  science: "science",
  english: "english",
  filipino: "filipino",
  mapeh: "mapeh",
  ap: "ap",
  tle: "tle",
  values: "values",
  esp: "values",
  "aralin panlipunan": "ap",
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [studentTab, setStudentTab] = useState<"progress" | "attendance">("progress");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [overview, setOverview] = useState<StudentOverview>(emptyStudentOverview);
  const [newStudent, setNewStudent] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    lrn: "",
    yearLevel: "",
    section: "",
    guardianContact: "",
  });

  const loadStudents = () => {
    setIsLoading(true);
    api
      .get("/api/students")
      .then(({ data }) => {
        setStudents(Array.isArray(data?.students) ? (data.students as StudentRow[]) : []);
      })
      .catch(() => {
        setStudents([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let active = true;
    api
      .get("/api/students")
      .then(({ data }) => {
        if (!active) return;
        setStudents(Array.isArray(data?.students) ? (data.students as StudentRow[]) : []);
      })
      .catch(() => {
        if (!active) return;
        setStudents([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const fullName = `${student.lastName}, ${student.firstName} ${student.middleName ?? ""}`.toLowerCase();
      const lrn = String(student.lrn ?? "").toLowerCase();
      return fullName.includes(q) || lrn.includes(q);
    });
  }, [query, students]);
  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const selected = filteredStudents.find((student) => student.id === selectedStudentId);
      if (selected) return selected;
    }
    return filteredStudents[0] ?? null;
  }, [filteredStudents, selectedStudentId]);
  const subjectChips = useMemo(() => ["All", ...(overview.subjects ?? [])], [overview.subjects]);

  useEffect(() => {
    if (!activeStudent?.id) {
      return;
    }
    let mounted = true;
    api
      .get(`/api/students/${activeStudent.id}/overview`)
      .then(({ data }) => {
        if (!mounted) return;
        setOverview((data?.overview as StudentOverview) ?? emptyStudentOverview);
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(emptyStudentOverview);
      });
    return () => {
      mounted = false;
    };
  }, [activeStudent?.id]);

  const progressSeries = useMemo(() => {
    const rows = overview.gradeTable?.length ? overview.gradeTable : emptyStudentOverview.gradeTable;
    const normalizedSubject = selectedSubject.trim().toLowerCase();
    const key = SUBJECT_TO_KEY[normalizedSubject];
    return rows.map((row, index) => {
      const quarterLabel = row.quarter?.replace("Quarter ", "Q") || `Q${index + 1}`;
      if (!key || selectedSubject === "All") {
        const avg = Math.round(
          (row.math + row.science + row.english + row.filipino + row.mapeh + row.ap + row.tle + row.values) / 8,
        );
        return { quarter: quarterLabel, value: avg };
      }
      return { quarter: quarterLabel, value: Number(row[key] ?? 0) };
    });
  }, [overview.gradeTable, selectedSubject]);

  const chart = useMemo(() => {
    const width = 720;
    const height = 220;
    const left = 40;
    const right = 20;
    const top = 14;
    const bottom = 32;
    const innerW = width - left - right;
    const innerH = height - top - bottom;
    const points = progressSeries.map((item, index) => {
      const x = left + (index / Math.max(progressSeries.length - 1, 1)) * innerW;
      const y = top + ((100 - item.value) / 100) * innerH;
      return { ...item, x, y };
    });
    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      innerH,
      points,
      line: points.map((p) => `${p.x},${p.y}`).join(" "),
      grid: [0, 25, 50, 75, 100],
    };
  }, [progressSeries]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h2 className="text-3xl font-semibold text-slate-900">Student Management</h2>
      <p className="text-sm text-slate-600">Manage student accounts and records.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Students</h3>
            <button
              type="button"
              onClick={() => {
                setCreateStatus("");
                setIsCreateOpen(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or LRN"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none ring-slate-200 focus:ring-2"
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Students: <span className="font-semibold text-slate-800">{filteredStudents.length}</span>
          </p>

          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filteredStudents.map((student) => {
              const isActive = activeStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "border-slate-300 bg-slate-100"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{`${student.lastName}, ${student.firstName}`}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{student.lrn || "-"}</p>
                </button>
              );
            })}
            {!filteredStudents.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                {isLoading ? "Loading students..." : "No students found."}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Student Profile</h3>
          {activeStudent ? (
            <div className="mt-4 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {`${activeStudent.firstName}${activeStudent.middleName ? ` ${activeStudent.middleName}` : ""} ${activeStudent.lastName}`}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LRN</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{activeStudent.lrn || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{activeStudent.email || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{activeStudent.yearLevel || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.sectionName || (activeStudent.sectionId ? `#${activeStudent.sectionId}` : "-")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.createdAt ? new Date(activeStudent.createdAt).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <button
                    type="button"
                    onClick={() => setStudentTab("progress")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      studentTab === "progress"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentTab("attendance")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      studentTab === "attendance"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Attendance
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {subjectChips.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedSubject(subject)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selectedSubject === subject
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>

                {studentTab === "progress" ? (
                  <div className="mt-4 overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="h-64 w-full min-w-[640px]"
                      role="img"
                      aria-label="Student progress chart"
                    >
                      {chart.grid.map((value) => {
                        const y = chart.top + ((100 - value) / 100) * chart.innerH;
                        return (
                          <g key={value}>
                            <line x1={chart.left} y1={y} x2={chart.width - chart.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                            <text x={8} y={y + 4} className="fill-slate-400 text-[11px]">
                              {value}
                            </text>
                          </g>
                        );
                      })}

                      <polyline fill="none" stroke="#4f46e5" strokeWidth="3" points={chart.line} />

                      {chart.points.map((point) => (
                        <g key={point.quarter}>
                          <circle cx={point.x} cy={point.y} r="4.5" fill="#4f46e5" />
                          <text x={point.x - 10} y={point.y - 10} className="fill-slate-700 text-[11px]">
                            {point.value}
                          </text>
                          <text x={point.x - 10} y={chart.height - 10} className="fill-slate-500 text-[11px]">
                            {point.quarter}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-center">
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
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {isLoading ? "Loading student profile..." : "Select a student from the left panel."}
            </div>
          )}
        </section>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create Student</h3>
              <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setIsCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="First name"
                value={newStudent.firstName}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, firstName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Last name"
                value={newStudent.lastName}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, lastName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Middle name (optional)"
                value={newStudent.middleName}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, middleName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Email"
                value={newStudent.email}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, email: e.target.value }))}
              />
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 sm:col-span-2">
                <input
                  className="w-full text-sm focus:outline-none"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={newStudent.password}
                  onChange={(e) => setNewStudent((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-xs font-medium text-slate-600">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="LRN"
                value={newStudent.lrn}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, lrn: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Grade level (e.g. Grade 9)"
                value={newStudent.yearLevel}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, yearLevel: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Section (e.g. Rizal)"
                value={newStudent.section}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, section: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Guardian number"
                value={newStudent.guardianContact}
                onChange={(e) => setNewStudent((prev) => ({ ...prev, guardianContact: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    setCreateStatus("Creating student...");
                    await api.post("/api/students", newStudent);
                    setCreateStatus("Student created.");
                    setIsCreateOpen(false);
                    setNewStudent({
                      firstName: "",
                      middleName: "",
                      lastName: "",
                      email: "",
                      password: "",
                      lrn: "",
                      yearLevel: "",
                      section: "",
                      guardianContact: "",
                    });
                    loadStudents();
                  } catch (err: unknown) {
                    const message: string =
                      typeof err === "object" &&
                      err !== null &&
                      "response" in err &&
                      typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
                        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
                          "Failed to create student.")
                        : "Failed to create student.";
                    setCreateStatus(message);
                  }
                }}
                className="sm:col-span-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              >
                Add Student
              </button>
              {createStatus ? <p className="sm:col-span-2 text-xs text-slate-600">{createStatus}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
