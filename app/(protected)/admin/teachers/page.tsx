"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/src/lib/http/client";

type TeacherRow = {
  id: number;
  email?: string | null;
  firstName: string;
  lastName: string;
  employeeNumber?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  sectionId?: number | null;
  createdAt?: string;
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [newTeacher, setNewTeacher] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    employeeNumber: "",
  });

  const loadTeachers = () => {
    setIsLoading(true);
    api
      .get("/api/teachers")
      .then(({ data }) => {
        setTeachers(Array.isArray(data?.teachers) ? (data.teachers as TeacherRow[]) : []);
      })
      .catch(() => {
        setTeachers([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let active = true;
    api
      .get("/api/teachers")
      .then(({ data }) => {
        if (!active) return;
        setTeachers(Array.isArray(data?.teachers) ? (data.teachers as TeacherRow[]) : []);
      })
      .catch(() => {
        if (!active) return;
        setTeachers([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((teacher) => {
      const fullName = `${teacher.lastName}, ${teacher.firstName}`.toLowerCase();
      const employeeNumber = String(teacher.employeeNumber ?? "").toLowerCase();
      return fullName.includes(q) || employeeNumber.includes(q);
    });
  }, [query, teachers]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h2 className="text-3xl font-semibold text-slate-900">Teacher Management</h2>
      <p className="text-sm text-slate-600">Manage teacher accounts and records.</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or employee number"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none ring-slate-200 focus:ring-2"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">
            Teachers: <span className="font-semibold text-slate-900">{filteredTeachers.length}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setCreateStatus("");
              setIsCreateOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Create Teacher
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Employee Number</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{teacher.employeeNumber || "-"}</td>
                  <td className="px-4 py-3">{`${teacher.lastName}, ${teacher.firstName}`}</td>
                  <td className="px-4 py-3">{teacher.email || "-"}</td>
                  <td className="px-4 py-3">{teacher.gradeLevel || "-"}</td>
                  <td className="px-4 py-3">{teacher.sectionName || (teacher.sectionId ? `#${teacher.sectionId}` : "-")}</td>
                  <td className="px-4 py-3">{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredTeachers.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {isLoading ? "Loading teachers..." : "No teachers found."}
          </div>
        ) : null}
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create Teacher</h3>
              <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setIsCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="First name"
                value={newTeacher.firstName}
                onChange={(e) => setNewTeacher((prev) => ({ ...prev, firstName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Last name"
                value={newTeacher.lastName}
                onChange={(e) => setNewTeacher((prev) => ({ ...prev, lastName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher((prev) => ({ ...prev, email: e.target.value }))}
              />
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 sm:col-span-2">
                <input
                  className="w-full text-sm focus:outline-none"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-xs font-medium text-slate-600">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Employee number"
                value={newTeacher.employeeNumber}
                onChange={(e) => setNewTeacher((prev) => ({ ...prev, employeeNumber: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    setCreateStatus("Creating teacher...");
                    await api.post("/api/teachers", newTeacher);
                    setCreateStatus("Teacher created.");
                    setIsCreateOpen(false);
                    setNewTeacher({ firstName: "", lastName: "", email: "", password: "", employeeNumber: "" });
                    loadTeachers();
                  } catch (err: unknown) {
                    const message =
                      typeof err === "object" &&
                      err !== null &&
                      "response" in err &&
                      typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
                        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                        : "Failed to create teacher.";
                    setCreateStatus(message);
                  }
                }}
                className="sm:col-span-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              >
                Add Teacher
              </button>
              {createStatus ? <p className="sm:col-span-2 text-xs text-slate-600">{createStatus}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
