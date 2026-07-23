"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../_components/AdminInsightsUI";
import { verifyAdminPassword } from "../_lib/admin-insights";

type Teacher = {
  id: number;
  firstName: string;
  lastName: string;
  employeeNumber?: string | null;
};

type TeacherSubject = {
  id: number;
  name: string;
  code?: string | null;
};

type SubjectRecord = TeacherSubject & {
  teachers: Teacher[];
};

type Notice = { type: "success" | "error"; message: string };

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const message = (error as { response?: { data?: { message?: unknown } } })
      .response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function AdminSubjectsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [mySubjects, setMySubjects] = useState<TeacherSubject[]>([]);
  const [subjectView, setSubjectView] = useState<"mine" | "teachers">("mine");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teacherResponse, mySubjectResponse] = await Promise.all([
        api.get("/api/teachers"),
        api.get("/api/admin/subjects"),
      ]);
      const teacherRows = Array.isArray(teacherResponse.data?.teachers)
        ? (teacherResponse.data.teachers as Teacher[])
        : [];
      setTeachers(teacherRows);
      setMySubjects(
        Array.isArray(mySubjectResponse.data?.subjects)
          ? (mySubjectResponse.data.subjects as TeacherSubject[])
          : [],
      );

      const results = await Promise.allSettled(
        teacherRows.map((teacher) =>
          api.get(`/api/teachers/${teacher.id}/subjects`),
        ),
      );
      const subjectMap = new Map<number, SubjectRecord>();
      teacherRows.forEach((teacher, index) => {
        const result = results[index];
        if (result?.status !== "fulfilled") return;
        const assigned = Array.isArray(result.value.data?.subjects)
          ? (result.value.data.subjects as TeacherSubject[])
          : [];
        assigned.forEach((subject) => {
          const existing = subjectMap.get(subject.id);
          if (existing) {
            if (!existing.teachers.some((item) => item.id === teacher.id)) {
              existing.teachers.push(teacher);
            }
          } else {
            subjectMap.set(subject.id, { ...subject, teachers: [teacher] });
          }
        });
      });
      setSubjects(
        Array.from(subjectMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    } catch (error) {
      setTeachers([]);
      setSubjects([]);
      setMySubjects([]);
      setNotice({
        type: "error",
        message: errorMessage(error, "Failed to load teacher subjects."),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const filteredSubjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return subjects;
    return subjects.filter((subject) => {
      const teacherNames = subject.teachers
        .map((teacher) => `${teacher.firstName} ${teacher.lastName}`)
        .join(" ");
      return `${subject.name} ${subject.code ?? ""} ${teacherNames}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, subjects]);
  const filteredMySubjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mySubjects;
    return mySubjects.filter((subject) =>
      `${subject.name} ${subject.code ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [mySubjects, query]);

  const submitAssignment = async () => {
    if (
      !selectedTeacherId ||
      !subjectName.trim() ||
      !adminPassword ||
      isSubmitting
    )
      return;
    setIsSubmitting(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      await api.post(`/api/teachers/${selectedTeacherId}/subjects`, {
        name: subjectName.trim(),
      });
      setIsAssignOpen(false);
      setSelectedTeacherId("");
      setSubjectName("");
      setAdminPassword("");
      setNotice({
        type: "success",
        message: "Subject assigned successfully.",
      });
      await loadSubjects();
    } catch (error) {
      const message = errorMessage(
        error,
        "Password verification or subject assignment failed.",
      );
      setPasswordError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMySubject = async () => {
    if (!subjectName.trim() || !adminPassword || isSubmitting) return;
    setIsSubmitting(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      await api.post("/api/admin/subjects", {
        name: subjectName.trim(),
        code: subjectCode.trim() || null,
      });
      setIsCreateOpen(false);
      setSubjectName("");
      setSubjectCode("");
      setAdminPassword("");
      setNotice({ type: "success", message: "My Subject saved successfully." });
      await loadSubjects();
    } catch (error) {
      setPasswordError(
        errorMessage(
          error,
          "Password verification or subject creation failed.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base">
      {notice ? (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 hover:bg-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <p className="text-sm text-slate-600">
        My Subjects and Teacher Subjects are separated to keep catalog creation
        and teacher assignment clear.
      </p>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setSubjectView("mine");
            setQuery("");
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${subjectView === "mine" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <BookOpenText className="h-4 w-4" />
          My Subjects
          <span className="rounded-full bg-white/15 px-2 py-0.5">
            {mySubjects.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSubjectView("teachers");
            setQuery("");
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${subjectView === "teachers" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <Users className="h-4 w-4" />
          Teacher Subjects
          <span className="rounded-full bg-white/15 px-2 py-0.5">
            {subjects.length}
          </span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="My Subjects"
          value={mySubjects.length}
          description="Subjects created by the Super Admin"
          icon={BookOpenText}
          href="/admin/subjects"
          loading={isLoading}
          tone="violet"
        />
        <AdminMetricCard
          label="Teacher Subjects"
          value={subjects.length}
          description="Unique subjects assigned to teachers"
          icon={BookOpenText}
          href="/admin/subjects"
          loading={isLoading}
          tone="emerald"
        />
        <AdminMetricCard
          label="Total Teachers"
          value={teachers.length}
          description="Available teacher accounts"
          icon={Users}
          href="/admin/teachers"
          loading={isLoading}
          tone="blue"
        />
        <AdminMetricCard
          label="Assignment Records"
          value={subjects.reduce(
            (total, subject) => total + subject.teachers.length,
            0,
          )}
          description="Teacher-to-subject relationships"
          icon={BookOpenText}
          href="/admin/subjects"
          loading={isLoading}
          tone="amber"
        />
      </div>

      <AdminPanel
        title={subjectView === "mine" ? "My Subjects" : "Teacher Subjects"}
        description={
          subjectView === "mine"
            ? "Standalone subjects created and owned by the Super Admin."
            : "Subjects currently assigned through teacher and class records."
        }
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadSubjects()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setSubjectName("");
                setSubjectCode("");
                setAdminPassword("");
                if (subjectView === "mine") setIsCreateOpen(true);
                else setIsAssignOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {subjectView === "mine" ? "Add My Subject" : "Assign Subject"}
            </button>
          </div>
        }
      >
        <label className="relative block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value.replace(/[^\p{L}\p{N}\s-]/gu, ""))
            }
            placeholder={
              subjectView === "mine"
                ? "Search My Subjects"
                : "Search subject, code, or teacher"
            }
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          {isLoading ? (
            <InsightState loading />
          ) : subjectView === "mine" ? (
            filteredMySubjects.length ? (
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">My Subject</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Catalog Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMySubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {subject.name}
                      </td>
                      <td className="px-4 py-3">{subject.code || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm text-blue-700">
                          Super Admin Subject
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <InsightState emptyLabel="No Super Admin subjects match the current search." />
            )
          ) : filteredSubjects.length ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Assigned Teachers</th>
                  <th className="px-4 py-3">Teacher Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSubjects.map((subject) => (
                  <tr
                    key={subject.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {subject.name}
                    </td>
                    <td className="px-4 py-3">{subject.code || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {subject.teachers.map((teacher) => (
                          <span
                            key={teacher.id}
                            className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-sm text-violet-700"
                          >
                            {teacher.firstName} {teacher.lastName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{subject.teachers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <InsightState emptyLabel="No assigned subjects match the current search." />
          )}
        </div>
      </AdminPanel>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-my-subject-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2
                id="create-my-subject-title"
                className="text-xl font-bold text-gray-800"
              >
                Add My Subject
              </h2>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close Add My Subject"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitMySubject();
              }}
              className="grid gap-4 p-6 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject Name
                  <input
                    required
                    value={subjectName}
                    onChange={(event) => setSubjectName(event.target.value)}
                    placeholder="Enter subject name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject Code (Optional)
                  <input
                    value={subjectCode}
                    onChange={(event) =>
                      setSubjectCode(
                        event.target.value
                          .replace(/[^A-Za-z0-9-]/g, "")
                          .toUpperCase(),
                      )
                    }
                    placeholder="e.g. MATH"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 uppercase outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Super Admin Password
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </label>
              </div>
              {passwordError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2"
                >
                  {passwordError}
                </p>
              ) : null}
              <div className="flex gap-3 pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !subjectName.trim() || !adminPassword || isSubmitting
                  }
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving…" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAssignOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-subject-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2
                id="assign-subject-title"
                className="text-xl font-bold text-gray-800"
              >
                Assign Subject
              </h2>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsAssignOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close Assign Subject"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitAssignment();
              }}
              className="grid gap-4 p-6 md:grid-cols-2"
            >
              <label className="block text-sm font-medium text-gray-700">
                Teacher
                <select
                  value={selectedTeacherId}
                  onChange={(event) => setSelectedTeacherId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                      {teacher.employeeNumber
                        ? ` (${teacher.employeeNumber})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Subject Name
                <input
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder="Enter subject name"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 md:col-span-2">
                Super Admin Password
                <div className="relative mt-1">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </label>
              {passwordError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2"
                >
                  {passwordError}
                </p>
              ) : null}
              <div className="flex gap-3 pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAssignOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !selectedTeacherId ||
                    !subjectName.trim() ||
                    !adminPassword ||
                    isSubmitting
                  }
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Assigning…" : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
