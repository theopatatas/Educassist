"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownAZ,
  ArrowUpAZ,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  LockKeyhole,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
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

type TeacherRow = {
  id: number;
  email?: string | null;
  firstName: string;
  lastName: string;
  employeeNumber?: string | null;
  middleName?: string | null;
  contactNumber?: string | null;
  gender?: string | null;
  isActive?: boolean;
  archivedAt?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  sectionId?: number | null;
  createdAt?: string;
};
type SubjectRow = { id: number; name: string };
type SortKey = "name" | "employeeNumber" | "grade" | "section" | "createdAt";
type Notice = { type: "success" | "error"; message: string };
type ProtectedAction =
  | "view"
  | "edit"
  | "archive"
  | "unarchive"
  | "activate"
  | "deactivate"
  | "assignSubject";
const emptyCreate = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  employeeNumber: "",
  contactNumber: "",
  gender: "",
};

function capitalizeTeacherName(value: string) {
  return value.replace(
    /(^|\s)(\p{L})/gu,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );
}

function apiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const message = (error as { response?: { data?: { message?: unknown } } })
      .response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function validateCreate(values: typeof emptyCreate) {
  const errors: Partial<Record<keyof typeof values, string>> = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";
  if (!values.email.trim()) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8)
    errors.password = "Password must contain at least 8 characters.";
  if (!values.employeeNumber.trim())
    errors.employeeNumber = "Employee number is required.";
  else if (!/^[A-Za-z0-9-]+$/.test(values.employeeNumber))
    errors.employeeNumber = "Use letters, numbers, and hyphens only.";
  if (!values.contactNumber.trim())
    errors.contactNumber = "Contact number is required.";
  else if (!/^09\d{9}$/.test(values.contactNumber))
    errors.contactNumber = "Enter 11 digits beginning with 09.";
  if (!values.gender) errors.gender = "Gender is required.";
  return errors;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjectsByTeacher, setSubjectsByTeacher] = useState<
    Record<number, SubjectRow[]>
  >({});
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newTeacher, setNewTeacher] = useState(emptyCreate);
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<keyof typeof emptyCreate, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTeacher, setEditTeacher] = useState<TeacherRow | null>(null);
  const [pendingEdit, setPendingEdit] = useState<TeacherRow | null>(null);
  const [pendingArchive, setPendingArchive] = useState<TeacherRow | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<{
    type: "activate" | "deactivate";
    teacher: TeacherRow;
  } | null>(null);
  const [directoryView, setDirectoryView] = useState<"active" | "archived">(
    "active",
  );
  const [passwordAction, setPasswordAction] = useState<{
    type: ProtectedAction;
    teacher: TeacherRow;
  } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadSubjects = useCallback(async (rows: TeacherRow[]) => {
    const results = await Promise.allSettled(
      rows.map((teacher) => api.get(`/api/teachers/${teacher.id}/subjects`)),
    );
    const next: Record<number, SubjectRow[]> = {};
    rows.forEach((teacher, index) => {
      const result = results[index];
      next[teacher.id] =
        result?.status === "fulfilled" &&
        Array.isArray(result.value.data?.subjects)
          ? result.value.data.subjects
          : [];
    });
    setSubjectsByTeacher(next);
  }, []);
  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/api/teachers");
      const rows = Array.isArray(data?.teachers)
        ? (data.teachers as TeacherRow[])
        : [];
      setTeachers(rows);
      await loadSubjects(rows);
    } catch (error) {
      setTeachers([]);
      setNotice({
        type: "error",
        message: apiError(error, "Failed to load teachers."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadSubjects]);
  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);
  useEffect(() => {
    if (!pendingStatusAction) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setPendingStatusAction(null);
        setAdminPassword("");
        setPasswordError("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSubmitting, pendingStatusAction]);

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teachers
            .map((teacher) => teacher.gradeLevel)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [teachers],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teachers
            .map((teacher) => teacher.sectionName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [teachers],
  );
  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(subjectsByTeacher)
            .flat()
            .map((subject) => subject.name),
        ),
      ).sort(),
    [subjectsByTeacher],
  );
  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = teachers.filter((teacher) => {
      const matchesDirectory =
        directoryView === "archived"
          ? Boolean(teacher.archivedAt)
          : !teacher.archivedAt;
      const matchesSearch =
        !q ||
        `${teacher.firstName} ${teacher.lastName} ${teacher.employeeNumber ?? ""}`
          .toLowerCase()
          .includes(q);
      return (
        matchesDirectory &&
        matchesSearch &&
        (!gradeFilter || teacher.gradeLevel === gradeFilter) &&
        (!sectionFilter || teacher.sectionName === sectionFilter) &&
        (!subjectFilter ||
          subjectsByTeacher[teacher.id]?.some(
            (subject) => subject.name === subjectFilter,
          ))
      );
    });
    return filtered.sort((a, b) => {
      const values: Record<SortKey, [string, string]> = {
        name: [`${a.lastName} ${a.firstName}`, `${b.lastName} ${b.firstName}`],
        employeeNumber: [a.employeeNumber ?? "", b.employeeNumber ?? ""],
        grade: [a.gradeLevel ?? "", b.gradeLevel ?? ""],
        section: [a.sectionName ?? "", b.sectionName ?? ""],
        createdAt: [a.createdAt ?? "", b.createdAt ?? ""],
      };
      return (
        values[sortKey][0].localeCompare(values[sortKey][1], undefined, {
          numeric: true,
        }) * (sortDirection === "asc" ? 1 : -1)
      );
    });
  }, [
    gradeFilter,
    directoryView,
    query,
    sectionFilter,
    sortDirection,
    sortKey,
    subjectFilter,
    subjectsByTeacher,
    teachers,
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const visibleTeachers = filteredTeachers.slice(
    (Math.min(page, pageCount) - 1) * pageSize,
    Math.min(page, pageCount) * pageSize,
  );
  const assignedCount = teachers.filter(
    (teacher) => (subjectsByTeacher[teacher.id]?.length ?? 0) > 0,
  ).length;
  const activeCount = teachers.filter(
    (teacher) => teacher.isActive !== false && !teacher.archivedAt,
  ).length;
  const archivedCount = teachers.filter((teacher) => teacher.archivedAt).length;

  const changeDirectoryView = (view: "active" | "archived") => {
    setDirectoryView(view);
    setPage(1);
    setQuery("");
    setGradeFilter("");
    setSectionFilter("");
    setSubjectFilter("");
  };

  const applyTeacherUpdate = (
    teacherId: number,
    updated: Partial<TeacherRow>,
  ) => {
    setTeachers((current) =>
      current.map((teacher) =>
        teacher.id === teacherId ? { ...teacher, ...updated } : teacher,
      ),
    );
    setSelectedTeacher((current) =>
      current?.id === teacherId ? { ...current, ...updated } : current,
    );
  };

  const openProfile = async (teacher: TeacherRow) => {
    setSelectedTeacher(teacher);
    setProfileLoading(true);
    setSubjectName("");
    try {
      const [{ data }] = await Promise.all([
        api.get(`/api/teachers/${teacher.id}`),
        refreshSubjects(teacher.id),
      ]);
      setSelectedTeacher((current) => ({
        ...teacher,
        ...(data?.teacher ?? {}),
        email: current?.email ?? teacher.email,
        sectionName: current?.sectionName ?? teacher.sectionName,
      }));
    } catch (error) {
      setNotice({
        type: "error",
        message: apiError(error, "Failed to load teacher profile."),
      });
    } finally {
      setProfileLoading(false);
    }
  };
  const refreshSubjects = async (teacherId: number) => {
    const { data } = await api.get(`/api/teachers/${teacherId}/subjects`);
    const subjects = Array.isArray(data?.subjects)
      ? (data.subjects as SubjectRow[])
      : [];
    setSubjectsByTeacher((current) => ({ ...current, [teacherId]: subjects }));
  };
  const submitCreate = async () => {
    const normalizedTeacher = { ...emptyCreate, ...newTeacher };
    const errors = validateCreate(normalizedTeacher);
    setCreateErrors(errors);
    if (Object.keys(errors).length || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post("/api/teachers", normalizedTeacher);
      setIsCreateOpen(false);
      setNewTeacher(emptyCreate);
      setNotice({ type: "success", message: "Teacher created successfully." });
      await loadTeachers();
    } catch (error) {
      setNotice({
        type: "error",
        message: apiError(error, "Failed to create teacher."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const saveEdit = async () => {
    if (!pendingEdit || isSubmitting) return;
    if (
      !pendingEdit.firstName.trim() ||
      !pendingEdit.lastName.trim() ||
      !pendingEdit.employeeNumber?.trim()
    ) {
      setNotice({
        type: "error",
        message: "First name, last name, and employee number are required.",
      });
      return;
    }
    if (
      !pendingEdit.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingEdit.email)
    ) {
      setNotice({ type: "error", message: "Enter a valid email address." });
      return;
    }
    if (
      !pendingEdit.contactNumber ||
      !/^09\d{9}$/.test(pendingEdit.contactNumber)
    ) {
      setNotice({
        type: "error",
        message: "Mobile number must be 11 digits beginning with 09.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.patch(`/api/teachers/${pendingEdit.id}`, {
        firstName: pendingEdit.firstName.trim(),
        middleName: pendingEdit.middleName?.trim() || null,
        lastName: pendingEdit.lastName.trim(),
        email: pendingEdit.email.trim(),
        contactNumber: pendingEdit.contactNumber,
        employeeNumber: pendingEdit.employeeNumber.trim(),
      });
      setPendingEdit(null);
      setEditTeacher(null);
      setNotice({ type: "success", message: "Teacher updated successfully." });
      if (selectedTeacher?.id === pendingEdit.id)
        setSelectedTeacher((current) =>
          current
            ? {
                ...current,
                ...(data?.teacher ?? pendingEdit),
                email: current.email,
                sectionName: current.sectionName,
              }
            : current,
        );
      await loadTeachers();
    } catch (error) {
      setNotice({
        type: "error",
        message: apiError(error, "Failed to update teacher."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const requestProtectedAction = (
    type: ProtectedAction,
    teacher: TeacherRow,
  ) => {
    setAdminPassword("");
    setPasswordError("");
    if (type === "activate" || type === "deactivate") {
      setPendingStatusAction({ type, teacher });
      return;
    }
    setPasswordAction({ type, teacher });
  };
  const confirmProtectedAction = async () => {
    if (!passwordAction || !adminPassword || isSubmitting) return;
    setIsSubmitting(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      const { type, teacher } = passwordAction;
      if (type === "archive") {
        setPasswordAction(null);
        setAdminPassword("");
        setPendingArchive(teacher);
        return;
      }
      if (type === "view") await openProfile(teacher);
      else if (type === "edit") setEditTeacher({ ...teacher });
      else if (type === "assignSubject") {
        if (!subjectName.trim()) return;
        await api.post(`/api/teachers/${teacher.id}/subjects`, {
          name: subjectName.trim(),
        });
        await refreshSubjects(teacher.id);
        setSubjectName("");
        setNotice({
          type: "success",
          message: "Subject assigned successfully.",
        });
      } else {
        const payload =
          type === "unarchive"
            ? { archived: false, isActive: false }
            : type === "activate"
              ? { archived: false, isActive: true }
              : { isActive: false };
        const { data } = await api.patch(
          `/api/teachers/${teacher.id}`,
          payload,
        );
        applyTeacherUpdate(teacher.id, {
          ...(data?.teacher ?? {}),
          archivedAt: type === "unarchive" ? null : teacher.archivedAt,
          isActive: type === "activate",
        });
        setNotice({
          type: "success",
          message:
            type === "unarchive"
              ? "Teacher restored from the archive. Activate the account when the teacher is ready to sign in."
              : type === "activate"
                ? "Teacher account activated."
                : "Teacher account deactivated.",
        });
        if (selectedTeacher?.id === teacher.id) setSelectedTeacher(null);
      }
      setPasswordAction(null);
      setAdminPassword("");
    } catch (error) {
      const message = apiError(
        error,
        "Password verification or action failed.",
      );
      if (passwordAction) setPasswordError(message);
      else setNotice({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmStatusAction = async () => {
    if (!pendingStatusAction || !adminPassword || isSubmitting) return;
    const { type, teacher } = pendingStatusAction;
    setIsSubmitting(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      const { data } = await api.patch(`/api/teachers/${teacher.id}`, {
        isActive: type === "activate",
      });
      applyTeacherUpdate(teacher.id, {
        ...(data?.teacher ?? {}),
        isActive: type === "activate",
      });
      setNotice({
        type: "success",
        message:
          type === "activate"
            ? "Teacher account activated."
            : "Teacher account deactivated.",
      });
      setPendingStatusAction(null);
      setAdminPassword("");
    } catch (error) {
      setPasswordError(
        apiError(error, "Password verification or status update failed."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmArchive = async () => {
    if (!pendingArchive || isSubmitting) return;
    const teacher = pendingArchive;
    setIsSubmitting(true);
    try {
      const { data } = await api.patch(`/api/teachers/${teacher.id}`, {
        archived: true,
        isActive: false,
      });
      applyTeacherUpdate(teacher.id, {
        ...(data?.teacher ?? {}),
        archivedAt: data?.teacher?.archivedAt ?? teacher.archivedAt,
        isActive: false,
      });
      setPendingArchive(null);
      if (selectedTeacher?.id === teacher.id) setSelectedTeacher(null);
      setNotice({ type: "success", message: "Teacher archived successfully." });
    } catch (error) {
      setNotice({
        type: "error",
        message: apiError(error, "Failed to archive teacher."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key)
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };
  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200";

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer">
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
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        Manage teacher accounts, assignments, and records.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Teachers"
          value={teachers.length}
          description="All teacher records"
          icon={Users}
          href="/admin/teachers"
          loading={isLoading}
          tone="blue"
        />
        <AdminMetricCard
          label="Active Teachers"
          value={activeCount}
          description="Active, non-archived accounts"
          icon={UserCheck}
          href="/admin/teachers"
          loading={isLoading}
          tone="emerald"
        />
        <AdminMetricCard
          label="With Assigned Subjects"
          value={assignedCount}
          description="From live subject assignments"
          icon={BookOpenText}
          href="/admin/teachers"
          loading={isLoading}
          tone="violet"
        />
        <AdminMetricCard
          label="Without Assigned Subjects"
          value={teachers.length - assignedCount}
          description="Requires subject assignment"
          icon={UserPlus}
          href="/admin/teachers"
          loading={isLoading}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => changeDirectoryView("active")}
          aria-pressed={directoryView === "active"}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors ${directoryView === "active" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <Users className="h-4 w-4" />
          Teacher Directory
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-sm">
            {teachers.length - archivedCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => changeDirectoryView("archived")}
          aria-pressed={directoryView === "archived"}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors ${directoryView === "archived" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <Archive className="h-4 w-4" />
          Archived Teachers
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-sm">
            {archivedCount}
          </span>
        </button>
      </div>

      <AdminPanel
        title={
          directoryView === "archived"
            ? "Archived Teachers"
            : "Teacher Directory"
        }
        description={
          directoryView === "archived"
            ? "Review archived teacher records and restore accounts when needed."
            : "Search, filter, sort, and manage registered teachers."
        }
        action={
          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              {exportOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs text-slate-400">
                    Export service unavailable
                  </p>
                  {["Export CSV", "Export Excel", "Export PDF"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-400 disabled:cursor-not-allowed"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateErrors({});
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create Teacher
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value.replace(/[^A-Za-z0-9\s]/g, ""));
                setPage(1);
              }}
              placeholder="Search name or employee number"
              title="Letters, numbers, and spaces only"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>
          <select
            value={gradeFilter}
            onChange={(event) => {
              setGradeFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All grades</option>
            {gradeOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={sectionFilter}
            onChange={(event) => {
              setSectionFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All sections</option>
            {sectionOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(event) => {
              setSubjectFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All subjects</option>
            {subjectOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            {isLoading ? (
              <InsightState loading />
            ) : (
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      ["employeeNumber", "Employee Number"],
                      ["name", "Teacher Name"],
                      ["", "Email"],
                      ["grade", "Grade"],
                      ["section", "Section"],
                      ["createdAt", "Created"],
                      ["", "Actions"],
                    ].map(([key, label]) => (
                      <th key={label} className="px-4 py-3">
                        {key ? (
                          <button
                            type="button"
                            onClick={() => changeSort(key as SortKey)}
                            className="inline-flex items-center gap-1 hover:text-slate-900"
                          >
                            {label}
                            {sortKey === key ? (
                              sortDirection === "asc" ? (
                                <ArrowDownAZ className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpAZ className="h-3.5 w-3.5" />
                              )
                            ) : null}
                          </button>
                        ) : (
                          label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {visibleTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      onClick={() => requestProtectedAction("view", teacher)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${teacher.archivedAt ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {teacher.employeeNumber || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {teacher.lastName}, {teacher.firstName}
                        {teacher.archivedAt ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            Archived
                          </span>
                        ) : teacher.isActive === false ? (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                            Inactive
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{teacher.email || "—"}</td>
                      <td className="px-4 py-3">{teacher.gradeLevel || "—"}</td>
                      <td className="px-4 py-3">
                        {teacher.sectionName ||
                          (teacher.sectionId ? `#${teacher.sectionId}` : "—")}
                      </td>
                      <td className="px-4 py-3">
                        {teacher.createdAt
                          ? new Date(teacher.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              requestProtectedAction("view", teacher)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label={`View ${teacher.firstName}`}
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {directoryView === "archived" ? (
                            <button
                              type="button"
                              onClick={() =>
                                requestProtectedAction("unarchive", teacher)
                              }
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                              aria-label={`Unarchive ${teacher.firstName}`}
                              title="Unarchive teacher"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  requestProtectedAction("edit", teacher)
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                aria-label={`Edit ${teacher.firstName}`}
                                title="Edit teacher"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  requestProtectedAction(
                                    teacher.isActive === false
                                      ? "activate"
                                      : "deactivate",
                                    teacher,
                                  )
                                }
                                className={`rounded-lg p-2 ${teacher.isActive === false ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
                                aria-label={`${teacher.isActive === false ? "Activate" : "Deactivate"} ${teacher.firstName}`}
                                title={
                                  teacher.isActive === false
                                    ? "Activate account"
                                    : "Deactivate account"
                                }
                              >
                                {teacher.isActive === false ? (
                                  <Power className="h-4 w-4" />
                                ) : (
                                  <PowerOff className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  requestProtectedAction("archive", teacher)
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                aria-label={`Archive ${teacher.firstName}`}
                                title="Archive teacher"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!isLoading && !visibleTeachers.length ? (
            <InsightState emptyLabel="No teachers match the current search and filters." />
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            {visibleTeachers.length
              ? (Math.min(page, pageCount) - 1) * pageSize + 1
              : 0}
            –
            {Math.min(
              Math.min(page, pageCount) * pageSize,
              filteredTeachers.length,
            )}{" "}
            of {filteredTeachers.length}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">
              Page {Math.min(page, pageCount)} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AdminPanel>

      {selectedTeacher ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedTeacher(null)
          }
        >
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Teacher Profile
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedTeacher.firstName}
                  {selectedTeacher.middleName
                    ? ` ${selectedTeacher.middleName}`
                    : ""}{" "}
                  {selectedTeacher.lastName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {profileLoading ? (
              <div className="mt-5">
                <InsightState loading />
              </div>
            ) : (
              <>
                <section className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      Personal Information
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        requestProtectedAction("edit", selectedTeacher)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      ["Employee Number", selectedTeacher.employeeNumber],
                      ["First Name", selectedTeacher.firstName],
                      ["Middle Name", selectedTeacher.middleName],
                      ["Last Name", selectedTeacher.lastName],
                      ["Email", selectedTeacher.email],
                      ["Contact Number", selectedTeacher.contactNumber],
                      ["Gender", selectedTeacher.gender],
                      ["Grade Assignment", selectedTeacher.gradeLevel],
                      [
                        "Section Assignment",
                        selectedTeacher.sectionName ||
                          (selectedTeacher.sectionId
                            ? `#${selectedTeacher.sectionId}`
                            : null),
                      ],
                      [
                        "Date Created",
                        selectedTeacher.createdAt
                          ? new Date(selectedTeacher.createdAt).toLocaleString()
                          : null,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-800">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Subject Assignment
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Subjects currently assigned through class records.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshSubjects(selectedTeacher.id)}
                      className="rounded-lg p-2 hover:bg-slate-100"
                      aria-label="Refresh subjects"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjectsByTeacher[selectedTeacher.id]?.length ? (
                      subjectsByTeacher[selectedTeacher.id].map((subject) => (
                        <span
                          key={subject.id}
                          className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm text-violet-700"
                        >
                          {subject.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No subjects assigned.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={subjectName}
                      onChange={(event) => setSubjectName(event.target.value)}
                      placeholder="Subject name"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!subjectName.trim() || isSubmitting}
                      onClick={() =>
                        requestProtectedAction("assignSubject", selectedTeacher)
                      }
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
                    >
                      Assign Subject
                    </button>
                  </div>
                </section>
                <section className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Grade and Section Assignment
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Grade</p>
                      <b className="mt-1 block">
                        {selectedTeacher.gradeLevel || "—"}
                      </b>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Section</p>
                      <b className="mt-1 block">
                        {selectedTeacher.sectionName || "—"}
                      </b>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    The current teacher update endpoint does not support
                    changing grade or section assignments.
                  </p>
                </section>
                <div className="mt-5 flex flex-wrap justify-between gap-2">
                  {selectedTeacher.archivedAt ? (
                    <button
                      type="button"
                      onClick={() =>
                        requestProtectedAction("unarchive", selectedTeacher)
                      }
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Unarchive Teacher
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          requestProtectedAction(
                            selectedTeacher.isActive === false
                              ? "activate"
                              : "deactivate",
                            selectedTeacher,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        {selectedTeacher.isActive === false ? (
                          <Power className="h-4 w-4" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                        {selectedTeacher.isActive === false
                          ? "Activate Account"
                          : "Deactivate Account"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestProtectedAction("archive", selectedTeacher)
                        }
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <Archive className="h-4 w-4" />
                        Archive Teacher
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create Teacher</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the teacher&apos;s account and personal information.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                [
                  "firstName",
                  "middleName",
                  "lastName",
                  "email",
                  "contactNumber",
                  "employeeNumber",
                ] as const
              ).map((key) => (
                <label
                  key={key}
                  className={`text-xs font-medium text-slate-600 ${key === "email" ? "sm:col-span-2" : ""} ${key === "employeeNumber" ? "sm:col-start-2 sm:col-span-2" : ""}`}
                >
                  {key === "firstName"
                    ? "First Name"
                    : key === "middleName"
                      ? "Middle Name (Optional)"
                      : key === "lastName"
                        ? "Last Name"
                        : key === "employeeNumber"
                          ? "Employee Number"
                          : key === "contactNumber"
                            ? "Contact Number"
                            : "Email"}
                  <input
                    value={newTeacher[key] ?? ""}
                    inputMode={key === "contactNumber" ? "numeric" : undefined}
                    maxLength={key === "contactNumber" ? 11 : undefined}
                    placeholder={
                      key === "contactNumber" ? "09XXXXXXXXX" : undefined
                    }
                    onChange={(event) => {
                      const value =
                        key === "contactNumber"
                          ? event.target.value.replace(/\D/g, "").slice(0, 11)
                          : key === "firstName" ||
                              key === "middleName" ||
                              key === "lastName"
                            ? capitalizeTeacherName(event.target.value)
                            : event.target.value;
                      setNewTeacher((current) => ({
                        ...current,
                        [key]: value,
                      }));
                    }}
                    className={fieldClass}
                  />
                  {createErrors[key] ? (
                    <span className="mt-1 block text-xs text-rose-600">
                      {createErrors[key]}
                    </span>
                  ) : null}
                </label>
              ))}
              <label className="text-xs font-medium text-slate-600 sm:row-start-3 sm:col-start-1">
                Gender
                <select
                  value={newTeacher.gender ?? ""}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      gender: event.target.value,
                    }))
                  }
                  className={`${fieldClass} bg-white`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {createErrors.gender ? (
                  <span className="mt-1 block text-xs text-rose-600">
                    {createErrors.gender}
                  </span>
                ) : null}
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-3">
                Password
                <div className="mt-1 flex rounded-xl border border-slate-200 px-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newTeacher.password ?? ""}
                    onChange={(event) =>
                      setNewTeacher((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 py-2.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {createErrors.password ? (
                  <span className="mt-1 block text-xs text-rose-600">
                    {createErrors.password}
                  </span>
                ) : null}
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitCreate}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isSubmitting ? "Creating…" : "Create Teacher"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTeacher ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">Edit Teacher</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Update the teacher&apos;s supported personal and account
                  information.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTeacher(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                [
                  "firstName",
                  "middleName",
                  "lastName",
                  "email",
                  "contactNumber",
                  "employeeNumber",
                ] as const
              ).map((key) => (
                <label
                  key={key}
                  className={`block text-xs font-medium text-slate-600 ${key === "email" ? "sm:col-span-2" : ""}`}
                >
                  {key === "firstName"
                    ? "First Name"
                    : key === "middleName"
                      ? "Middle Name (Optional)"
                      : key === "lastName"
                        ? "Last Name"
                        : key === "email"
                          ? "Email"
                          : key === "contactNumber"
                            ? "Mobile Number"
                            : "Employee Number"}
                  <input
                    value={editTeacher[key] ?? ""}
                    inputMode={key === "contactNumber" ? "numeric" : undefined}
                    maxLength={key === "contactNumber" ? 11 : undefined}
                    placeholder={
                      key === "contactNumber" ? "09XXXXXXXXX" : undefined
                    }
                    onChange={(event) => {
                      const value =
                        key === "contactNumber"
                          ? event.target.value.replace(/\D/g, "").slice(0, 11)
                          : event.target.value;
                      setEditTeacher((current) =>
                        current ? { ...current, [key]: value } : current,
                      );
                    }}
                    className={fieldClass}
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditTeacher(null)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setPendingEdit(editTeacher)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Review Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingEdit ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">Save Changes?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Update {pendingEdit.firstName} {pendingEdit.lastName} with the
              entered information?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingEdit(null)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={saveEdit}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingArchive ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-confirm-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="archive-confirm-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Archive Teacher?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Password verified. Archive{" "}
                  <b>
                    {pendingArchive.firstName} {pendingArchive.lastName}
                  </b>
                  ? The account will be deactivated and moved to Archived
                  Teachers. You can unarchive it later.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingArchive(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void confirmArchive()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isSubmitting ? "Archiving…" : "Archive Teacher"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingStatusAction ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setPendingStatusAction(null);
              setAdminPassword("");
              setPasswordError("");
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-xl p-2.5 ${pendingStatusAction.type === "activate" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
              >
                {pendingStatusAction.type === "activate" ? (
                  <Power className="h-5 w-5" />
                ) : (
                  <PowerOff className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2
                  id="status-confirm-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {pendingStatusAction.type === "activate"
                    ? "Activate Teacher Account?"
                    : "Deactivate Teacher Account?"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Confirm that you want to {pendingStatusAction.type}{" "}
                  <b>
                    {pendingStatusAction.teacher.firstName}{" "}
                    {pendingStatusAction.teacher.lastName}
                  </b>
                  . No account changes occur until you click Confirm.
                </p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Super Admin Password
              <input
                autoFocus
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className={fieldClass}
                autoComplete="current-password"
              />
            </label>
            {passwordError ? (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {passwordError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setPendingStatusAction(null);
                  setAdminPassword("");
                  setPasswordError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!adminPassword || isSubmitting}
                onClick={() => void confirmStatusAction()}
                className={`rounded-xl px-4 py-2 text-sm text-white disabled:opacity-40 ${pendingStatusAction.type === "activate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}
              >
                {isSubmitting
                  ? "Processing…"
                  : `Confirm ${pendingStatusAction.type === "activate" ? "Activation" : "Deactivation"}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {passwordAction ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-password-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="admin-password-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Super Admin Verification
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your password to{" "}
                  {passwordAction.type.replace(/([A-Z])/g, " $1").toLowerCase()}{" "}
                  {passwordAction.teacher.firstName}{" "}
                  {passwordAction.teacher.lastName}.
                </p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Super Admin Password
              <input
                autoFocus
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className={fieldClass}
                autoComplete="current-password"
              />
            </label>
            {passwordError ? (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {passwordError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPasswordAction(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!adminPassword || isSubmitting}
                onClick={() => void confirmProtectedAction()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isSubmitting ? "Verifying…" : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
