"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import { AdminMetricCard } from "../_components/AdminInsightsUI";
import { verifyAdminPassword } from "../_lib/admin-insights";

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
  gender?: string | null;
  studentMobileNumber?: string | null;
  guardianName?: string | null;
  guardianContact?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  isActive?: boolean;
  parent?: {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
  previousGradeLevel?: string | null;
  promotedAt?: string | null;
  graduatedAt?: string | null;
  archivedAt?: string | null;
};
type AcademicSubjectRecord = {
  subjectId: number;
  subjectName: string;
  subjectCode?: string | null;
  quarter1: number | null;
  quarter2: number | null;
  quarter3: number | null;
  quarter4: number | null;
  finalGrade: number | null;
};
type AttendanceHistoryRow = {
  id: number;
  date: string;
  status: string;
  subject?: string | null;
  recordedBy?: string | null;
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
    {
      quarter: "Quarter 1",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 2",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 3",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 4",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
  ],
};

const SUBJECT_TO_KEY: Record<
  string,
  keyof StudentOverview["gradeTable"][number]
> = {
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

const studentNameFields = new Set([
  "firstName",
  "middleName",
  "lastName",
  "guardianName",
  "motherName",
  "fatherName",
]);

function formatStudentName(value: string) {
  return value
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(
      /(^|\s)(\p{L})/gu,
      (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
    );
}

function getNextGradeLevel(yearLevel?: string | null) {
  const match = String(yearLevel ?? "").match(/grade\s*(\d+)/i);
  const grade = match ? Number(match[1]) : Number.NaN;
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) return null;
  return grade === 12 ? "Graduated" : `Grade ${grade + 1}`;
}

export default function AdminStudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState<
    "name" | "lrn" | "grade" | "section" | "createdAt"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [promotionStatus, setPromotionStatus] = useState("");
  const [pendingPromotion, setPendingPromotion] = useState<StudentRow | null>(
    null,
  );
  const [pendingPromotionUndo, setPendingPromotionUndo] =
    useState<StudentRow | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [studentTab, setStudentTab] = useState<"progress" | "attendance">(
    "progress",
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [overview, setOverview] =
    useState<StudentOverview>(emptyStudentOverview);
  const [academicRecords, setAcademicRecords] = useState<
    AcademicSubjectRecord[]
  >([]);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistoryRow[]
  >([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [pendingStudentSave, setPendingStudentSave] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StudentRow | null>(null);
  const [directoryView, setDirectoryView] = useState<
    "current" | "graduated" | "archived"
  >("current");
  const [passwordAction, setPasswordAction] = useState<{
    type: "edit" | "archive" | "unarchive";
    student: StudentRow;
  } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isStudentActionPending, setIsStudentActionPending] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    lrn: "",
    studentMobileNumber: "",
    gender: "",
    yearLevel: "",
    section: "",
    guardianName: "",
    motherName: "",
    fatherName: "",
    guardianContact: "",
  });

  const loadStudents = () => {
    setIsLoading(true);
    api
      .get("/api/students")
      .then(({ data }) => {
        setStudents(
          Array.isArray(data?.students) ? (data.students as StudentRow[]) : [],
        );
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
        setStudents(
          Array.isArray(data?.students) ? (data.students as StudentRow[]) : [],
        );
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
    const filtered = students.filter((student) => {
      const fullName =
        `${student.lastName}, ${student.firstName} ${student.middleName ?? ""}`.toLowerCase();
      const lrn = String(student.lrn ?? "").toLowerCase();
      return (
        (directoryView === "archived"
          ? Boolean(student.archivedAt)
          : directoryView === "graduated"
            ? Boolean(student.graduatedAt) && !student.archivedAt
            : !student.graduatedAt && !student.archivedAt) &&
        (!q || fullName.includes(q) || lrn.includes(q)) &&
        (!gradeFilter || student.yearLevel === gradeFilter) &&
        (!sectionFilter || student.sectionName === sectionFilter) &&
        (!genderFilter || student.gender === genderFilter) &&
        (!statusFilter ||
          (statusFilter === "active"
            ? student.isActive !== false
            : student.isActive === false))
      );
    });
    return filtered.sort((a, b) => {
      const values = {
        name: [`${a.lastName} ${a.firstName}`, `${b.lastName} ${b.firstName}`],
        lrn: [a.lrn ?? "", b.lrn ?? ""],
        grade: [a.yearLevel ?? "", b.yearLevel ?? ""],
        section: [a.sectionName ?? "", b.sectionName ?? ""],
        createdAt: [a.createdAt ?? "", b.createdAt ?? ""],
      }[sortField];
      return (
        values[0].localeCompare(values[1], undefined, { numeric: true }) *
        (sortDirection === "asc" ? 1 : -1)
      );
    });
  }, [
    genderFilter,
    directoryView,
    gradeFilter,
    query,
    sectionFilter,
    sortDirection,
    sortField,
    statusFilter,
    students,
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visibleStudents = filteredStudents.slice(
    (Math.min(page, pageCount) - 1) * pageSize,
    Math.min(page, pageCount) * pageSize,
  );
  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => student.yearLevel)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [students],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => student.sectionName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [students],
  );
  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const selected = filteredStudents.find(
        (student) => student.id === selectedStudentId,
      );
      if (selected) return selected;
    }
    return filteredStudents[0] ?? null;
  }, [filteredStudents, selectedStudentId]);
  const subjectChips = useMemo(
    () => ["All", ...(overview.subjects ?? [])],
    [overview.subjects],
  );

  useEffect(() => {
    if (!activeStudent?.id) {
      setAcademicRecords([]);
      setAttendanceHistory([]);
      return;
    }
    let mounted = true;
    setDetailsLoading(true);
    setDetailsError("");
    Promise.all([
      api.get(`/api/students/${activeStudent.id}`),
      api.get(`/api/students/${activeStudent.id}/overview`),
      api.get(`/api/students/${activeStudent.id}/academic-record`),
      api.get(`/api/students/${activeStudent.id}/attendance`),
    ])
      .then(
        ([
          profileResponse,
          overviewResponse,
          academicResponse,
          attendanceResponse,
        ]) => {
          if (!mounted) return;
          const details = profileResponse.data?.student as
            | StudentRow
            | undefined;
          if (details) {
            setStudents((current) =>
              current.map((student) =>
                student.id === activeStudent.id
                  ? { ...student, ...details }
                  : student,
              ),
            );
          }
          setOverview(
            (overviewResponse.data?.overview as StudentOverview) ??
              emptyStudentOverview,
          );
          setAcademicRecords(
            Array.isArray(academicResponse.data?.record?.subjects)
              ? academicResponse.data.record.subjects
              : [],
          );
          setAttendanceHistory(
            Array.isArray(attendanceResponse.data?.attendance)
              ? attendanceResponse.data.attendance
              : [],
          );
        },
      )
      .catch(() => {
        if (!mounted) return;
        setOverview(emptyStudentOverview);
        setAcademicRecords([]);
        setAttendanceHistory([]);
        setDetailsError("Some student details could not be loaded.");
      })
      .finally(() => {
        if (mounted) setDetailsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeStudent?.id]);

  const progressSeries = useMemo(() => {
    const rows = overview.gradeTable?.length
      ? overview.gradeTable
      : emptyStudentOverview.gradeTable;
    const normalizedSubject = selectedSubject.trim().toLowerCase();
    const key = SUBJECT_TO_KEY[normalizedSubject];
    return rows.map((row, index) => {
      const quarterLabel =
        row.quarter?.replace("Quarter ", "Q") || `Q${index + 1}`;
      if (!key || selectedSubject === "All") {
        const avg = Math.round(
          (row.math +
            row.science +
            row.english +
            row.filipino +
            row.mapeh +
            row.ap +
            row.tle +
            row.values) /
            8,
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
      const x =
        left + (index / Math.max(progressSeries.length - 1, 1)) * innerW;
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

  const confirmPromotion = async () => {
    if (!pendingPromotion || isPromoting) return;
    setIsPromoting(true);
    try {
      const { data } = await api.patch(
        `/api/students/${pendingPromotion.id}/promote`,
      );
      const nextGradeLevel = String(data?.nextGradeLevel ?? "");
      const savedGradeLevel = String(
        data?.student?.yearLevel ?? pendingPromotion.yearLevel ?? "",
      );
      setStudents((current) =>
        current.map((student) =>
          student.id === pendingPromotion.id
            ? {
                ...student,
                ...(data?.student ?? {}),
                yearLevel: savedGradeLevel || student.yearLevel,
                isActive: data?.graduated ? true : student.isActive,
              }
            : student,
        ),
      );
      setOverview((current) => ({
        ...current,
        student: {
          ...current.student,
          gradeLevel: savedGradeLevel || current.student.gradeLevel,
        },
      }));
      setPromotionStatus(
        data?.graduated
          ? `${pendingPromotion.firstName} ${pendingPromotion.lastName} was marked as graduated and moved to Graduated Students.`
          : `${pendingPromotion.firstName} ${pendingPromotion.lastName} was promoted from ${data?.previousGradeLevel} to ${nextGradeLevel}.`,
      );
      setPendingPromotion(null);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } })
          .response?.data?.message === "string"
          ? String(
              (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message,
            )
          : "Failed to promote student.";
      setPromotionStatus(message);
    } finally {
      setIsPromoting(false);
    }
  };

  const confirmPromotionUndo = async () => {
    if (!pendingPromotionUndo || isPromoting) return;
    setIsPromoting(true);
    try {
      const { data } = await api.patch(
        `/api/students/${pendingPromotionUndo.id}/promotion/undo`,
      );
      const restoredGradeLevel = String(data?.restoredGradeLevel ?? "");
      setStudents((current) =>
        current.map((student) =>
          student.id === pendingPromotionUndo.id
            ? {
                ...student,
                ...(data?.student ?? {}),
                yearLevel: restoredGradeLevel || student.yearLevel,
                previousGradeLevel: null,
                promotedAt: null,
                graduatedAt: null,
                isActive: pendingPromotionUndo.graduatedAt
                  ? true
                  : student.isActive,
              }
            : student,
        ),
      );
      setOverview((current) => ({
        ...current,
        student: {
          ...current.student,
          gradeLevel: restoredGradeLevel || current.student.gradeLevel,
        },
      }));
      setPromotionStatus(
        `Promotion undone. ${pendingPromotionUndo.firstName} ${pendingPromotionUndo.lastName} was restored from ${data?.promotedGradeLevel} to ${restoredGradeLevel}.`,
      );
      setPendingPromotionUndo(null);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } })
          .response?.data?.message === "string"
          ? String(
              (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message,
            )
          : "Failed to undo the promotion.";
      setPromotionStatus(message);
    } finally {
      setIsPromoting(false);
    }
  };

  const saveStudentChanges = async () => {
    if (!editStudent || isStudentActionPending) return;
    if (!editStudent.firstName.trim() || !editStudent.lastName.trim()) {
      setPromotionStatus("First name and last name are required.");
      return;
    }
    if (
      editStudent.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editStudent.email)
    ) {
      setPromotionStatus("Enter a valid student email address.");
      return;
    }
    if (
      editStudent.studentMobileNumber &&
      !/^\d{11}$/.test(editStudent.studentMobileNumber)
    ) {
      setPromotionStatus(
        "Student mobile number must contain exactly 11 digits.",
      );
      return;
    }
    if (
      editStudent.guardianContact &&
      !/^\d{11}$/.test(editStudent.guardianContact)
    ) {
      setPromotionStatus("Guardian number must contain exactly 11 digits.");
      return;
    }
    setIsStudentActionPending(true);
    try {
      const { data } = await api.patch(`/api/students/${editStudent.id}`, {
        email: editStudent.email,
        firstName: editStudent.firstName,
        middleName: editStudent.middleName,
        lastName: editStudent.lastName,
        gender: editStudent.gender,
        studentMobileNumber: editStudent.studentMobileNumber,
        yearLevel: editStudent.yearLevel,
        section: editStudent.sectionName,
        guardianName: editStudent.guardianName,
        guardianContact: editStudent.guardianContact,
        motherName: editStudent.motherName,
        fatherName: editStudent.fatherName,
      });
      const updated = data?.student as StudentRow;
      setStudents((current) =>
        current.map((student) =>
          student.id === editStudent.id ? { ...student, ...updated } : student,
        ),
      );
      setEditStudent(null);
      setPendingStudentSave(false);
      setPromotionStatus("Student updated successfully.");
    } catch (error: unknown) {
      const responseMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setPromotionStatus(responseMessage || "Failed to update student.");
    } finally {
      setIsStudentActionPending(false);
    }
  };

  const confirmStudentPasswordAction = async () => {
    if (!passwordAction || !adminPassword || isStudentActionPending) return;
    setIsStudentActionPending(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      const { type, student } = passwordAction;
      if (type === "edit") setEditStudent({ ...student });
      else if (type === "archive") setPendingDelete(student);
      else {
        const { data } = await api.patch(`/api/students/${student.id}`, {
          archived: false,
          isActive: false,
        });
        setStudents((current) =>
          current.map((item) =>
            item.id === student.id
              ? {
                  ...item,
                  ...(data?.student ?? {}),
                  archivedAt: null,
                  isActive: false,
                }
              : item,
          ),
        );
        setPromotionStatus(
          "Student restored from the archive. The account remains inactive.",
        );
      }
      setPasswordAction(null);
      setAdminPassword("");
    } catch (error: unknown) {
      const responseMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setPasswordError(
        responseMessage || "Super Admin password verification failed.",
      );
    } finally {
      setIsStudentActionPending(false);
    }
  };

  const confirmStudentDelete = async () => {
    if (!pendingDelete || isStudentActionPending) return;
    setIsStudentActionPending(true);
    try {
      const { data } = await api.patch(`/api/students/${pendingDelete.id}`, {
        archived: true,
        isActive: false,
      });
      setStudents((current) =>
        current.map((student) =>
          student.id === pendingDelete.id
            ? { ...student, ...(data?.student ?? {}), isActive: false }
            : student,
        ),
      );
      if (selectedStudentId === pendingDelete.id) setSelectedStudentId(null);
      setPendingDelete(null);
      setPromotionStatus("Student archived successfully.");
    } catch (error: unknown) {
      const responseMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setPromotionStatus(responseMessage || "Failed to archive student.");
    } finally {
      setIsStudentActionPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <p className="text-sm text-slate-600">
        Manage student accounts and records.
      </p>
      {promotionStatus ? (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <span>{promotionStatus}</span>
          <button
            type="button"
            onClick={() => setPromotionStatus("")}
            className="rounded-lg p-1 hover:bg-emerald-100"
            aria-label="Dismiss promotion message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Students"
          value={students.length}
          description="All student records"
          icon={Users}
          href="/admin/students"
          loading={isLoading}
          tone="blue"
        />
        <AdminMetricCard
          label="Active Students"
          value={
            students.filter(
              (student) =>
                student.isActive !== false &&
                !student.graduatedAt &&
                !student.archivedAt,
            ).length
          }
          description="Active student accounts"
          icon={UserCheck}
          href="/admin/students"
          loading={isLoading}
          tone="emerald"
        />
        <AdminMetricCard
          label="With Linked Parents"
          value={students.filter((student) => Boolean(student.parent)).length}
          description="Students linked to parent accounts"
          icon={Users}
          href="/admin/students"
          loading={isLoading}
          tone="violet"
        />
        <AdminMetricCard
          label="Without Linked Parents"
          value={students.filter((student) => !student.parent).length}
          description="Students without linked accounts"
          icon={Users}
          href="/admin/students"
          loading={isLoading}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {(
          [
            [
              "current",
              "Current Students",
              Users,
              students.filter(
                (student) => !student.graduatedAt && !student.archivedAt,
              ).length,
            ],
            [
              "graduated",
              "Graduated Students",
              GraduationCap,
              students.filter(
                (student) => student.graduatedAt && !student.archivedAt,
              ).length,
            ],
            [
              "archived",
              "Archived Students",
              Archive,
              students.filter((student) => student.archivedAt).length,
            ],
          ] as const
        ).map(([view, label, Icon, count]) => (
          <button
            key={view}
            type="button"
            onClick={() => {
              setDirectoryView(view);
              setSelectedStudentId(null);
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${directoryView === view ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="rounded-full bg-white/15 px-2 py-0.5">
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
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
            <button
              type="button"
              disabled
              title="No student export endpoint is available"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-400 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                    .replace(/[^A-Za-z0-9 ]/g, "")
                    .replace(/ {2,}/g, " "),
                )
              }
              placeholder="Search by name or LRN"
              title="Letters, numbers, and spaces only"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none ring-slate-200 focus:ring-2"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={gradeFilter}
              onChange={(event) => {
                setGradeFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
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
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">All sections</option>
              {sectionOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              value={genderFilter}
              onChange={(event) => {
                setGenderFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">All genders</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sortField}
              onChange={(event) =>
                setSortField(event.target.value as typeof sortField)
              }
              className="col-span-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            >
              <option value="name">Sort by name</option>
              <option value="lrn">Sort by LRN</option>
              <option value="grade">Sort by grade</option>
              <option value="section">Sort by section</option>
              <option value="createdAt">Sort by date created</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setSortDirection((current) =>
                  current === "asc" ? "desc" : "asc",
                )
              }
              className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Students:{" "}
            <span className="font-semibold text-slate-800">
              {filteredStudents.length}
            </span>
          </p>

          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {visibleStudents.map((student) => {
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
                  <p className="mt-0.5 text-xs text-slate-500">
                    {student.lrn || "-"}
                  </p>
                </button>
              );
            })}
            {!filteredStudents.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                {isLoading ? "Loading students..." : "No students found."}
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">
              Page {Math.min(page, pageCount)} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Student Profile
              </h3>
              {detailsError ? (
                <p className="mt-1 text-sm text-rose-600">{detailsError}</p>
              ) : null}
            </div>
            {activeStudent ? (
              <div className="flex gap-2">
                {activeStudent.archivedAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPassword("");
                      setPasswordError("");
                      setPasswordAction({
                        type: "unarchive",
                        student: activeStudent,
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Unarchive
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPassword("");
                        setPasswordError("");
                        setPasswordAction({
                          type: "edit",
                          student: activeStudent,
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPassword("");
                        setPasswordError("");
                        setPasswordAction({
                          type: "archive",
                          student: activeStudent,
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
          {activeStudent ? (
            <div className="mt-4 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {`${activeStudent.firstName}${activeStudent.middleName ? ` ${activeStudent.middleName}` : ""} ${activeStudent.lastName}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-sm font-medium ${activeStudent.archivedAt ? "bg-slate-200 text-slate-700" : activeStudent.graduatedAt ? "bg-violet-100 text-violet-700" : activeStudent.isActive === false ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {activeStudent.archivedAt
                      ? "Archived"
                      : activeStudent.graduatedAt
                        ? "Graduated"
                        : activeStudent.isActive === false
                          ? "Inactive"
                          : "Active"}
                  </span>
                  {activeStudent.promotedAt ? (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-sm font-medium text-violet-700">
                      Promoted{" "}
                      {new Date(activeStudent.promotedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    LRN
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.lrn || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.email || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Grade
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {activeStudent.yearLevel || "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {activeStudent.previousGradeLevel &&
                      activeStudent.promotedAt ? (
                        <button
                          type="button"
                          onClick={() => setPendingPromotionUndo(activeStudent)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Undo
                        </button>
                      ) : null}
                      {!activeStudent.graduatedAt &&
                      !activeStudent.archivedAt &&
                      getNextGradeLevel(activeStudent.yearLevel) ? (
                        <button
                          type="button"
                          onClick={() => setPendingPromotion(activeStudent)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                          Promote
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Section
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.sectionName ||
                      (activeStudent.sectionId
                        ? `#${activeStudent.sectionId}`
                        : "-")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeStudent.createdAt
                      ? new Date(activeStudent.createdAt).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-900">
                    Personal Information
                  </h4>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Gender", activeStudent.gender],
                      ["Mobile Number", activeStudent.studentMobileNumber],
                      [
                        "Account Status",
                        activeStudent.archivedAt
                          ? "Archived"
                          : activeStudent.graduatedAt
                            ? "Graduated"
                            : activeStudent.isActive === false
                              ? "Inactive"
                              : "Active",
                      ],
                      [
                        "Latest Promotion",
                        activeStudent.promotedAt
                          ? new Date(activeStudent.promotedAt).toLocaleString()
                          : null,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-900">
                    Parent / Guardian Information
                  </h4>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Guardian Name", activeStudent.guardianName],
                      ["Guardian Number", activeStudent.guardianContact],
                      ["Mother's Name", activeStudent.motherName],
                      ["Father's Name", activeStudent.fatherName],
                      [
                        "Linked Parent",
                        activeStudent.parent
                          ? `${activeStudent.parent.firstName} ${activeStudent.parent.lastName}`.trim()
                          : null,
                      ],
                      [
                        "Parent Account ID",
                        activeStudent.parent?.userId
                          ? `#${activeStudent.parent.userId}`
                          : null,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Promotion History
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest promotion information stored by the backend.
                    </p>
                  </div>
                  <ArrowUpCircle className="h-5 w-5 text-slate-400" />
                </div>
                {activeStudent.promotedAt &&
                activeStudent.previousGradeLevel ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-500">Previous Grade</p>
                      <p className="mt-1 font-semibold">
                        {activeStudent.previousGradeLevel}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-500">Current Grade</p>
                      <p className="mt-1 font-semibold">
                        {activeStudent.graduatedAt
                          ? "Graduated"
                          : activeStudent.yearLevel}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-500">Promotion Date</p>
                      <p className="mt-1 font-semibold">
                        {new Date(activeStudent.promotedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                    No promotion history is available for this student.
                  </p>
                )}
              </section>

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
                  <div className="mt-4 space-y-5">
                    <div className="overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${chart.width} ${chart.height}`}
                        className="h-64 w-full min-w-[640px]"
                        role="img"
                        aria-label="Student progress chart"
                      >
                        {chart.grid.map((value) => {
                          const y =
                            chart.top + ((100 - value) / 100) * chart.innerH;
                          return (
                            <g key={value}>
                              <line
                                x1={chart.left}
                                y1={y}
                                x2={chart.width - chart.right}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                              />
                              <text
                                x={8}
                                y={y + 4}
                                className="fill-slate-400 text-[11px]"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        })}

                        <polyline
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="3"
                          points={chart.line}
                        />

                        {chart.points.map((point) => (
                          <g key={point.quarter}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="4.5"
                              fill="#4f46e5"
                            />
                            <text
                              x={point.x - 10}
                              y={point.y - 10}
                              className="fill-slate-700 text-[11px]"
                            >
                              {point.value}
                            </text>
                            <text
                              x={point.x - 10}
                              y={chart.height - 10}
                              className="fill-slate-500 text-[11px]"
                            >
                              {point.quarter}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Complete Academic Record
                          </h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                          {academicRecords.length} subjects
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        {detailsLoading ? (
                          <p className="p-6 text-center text-sm text-slate-500">
                            Loading academic records…
                          </p>
                        ) : academicRecords.length ? (
                          <table className="w-full min-w-[720px] text-left text-sm">
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
                                  <th
                                    key={heading}
                                    className="px-4 py-3 font-semibold"
                                  >
                                    {heading}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {academicRecords.map((record) => (
                                <tr
                                  key={record.subjectId}
                                  className="hover:bg-slate-50"
                                >
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
                                    <td key={index} className="px-4 py-3">
                                      {grade ?? "Not submitted"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="p-6 text-center text-sm text-slate-500">
                            No academic grade records are available for this
                            student.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-5">
                    <div className="grid grid-cols-1 gap-3 text-center md:grid-cols-4">
                      <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                        <p className="text-xs font-semibold uppercase text-green-700">
                          Present
                        </p>
                        <p className="mt-1 text-xl font-bold text-green-900">
                          {overview.attendance.present}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-semibold uppercase text-amber-700">
                          Late
                        </p>
                        <p className="mt-1 text-xl font-bold text-amber-900">
                          {overview.attendance.late}
                        </p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                        <p className="text-xs font-semibold uppercase text-red-700">
                          Absent
                        </p>
                        <p className="mt-1 text-xl font-bold text-red-900">
                          {overview.attendance.absent}
                        </p>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <p className="text-xs font-semibold uppercase text-blue-700">
                          Attendance Rate
                        </p>
                        <p className="mt-1 text-xl font-bold text-blue-900">
                          {overview.attendance.rate}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        Attendance History
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Complete attendance entries stored for this student.
                      </p>
                      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                        {detailsLoading ? (
                          <p className="p-6 text-center text-sm text-slate-500">
                            Loading attendance history…
                          </p>
                        ) : attendanceHistory.length ? (
                          <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                {[
                                  "Date",
                                  "Subject",
                                  "Status",
                                  "Recorded By",
                                ].map((heading) => (
                                  <th
                                    key={heading}
                                    className="px-4 py-3 font-semibold"
                                  >
                                    {heading}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {attendanceHistory.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    {new Date(
                                      `${row.date}T00:00:00`,
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3">
                                    {row.subject || "—"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-2.5 py-1 font-medium capitalize ${row.status === "present" ? "bg-emerald-50 text-emerald-700" : row.status === "late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {row.recordedBy || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="p-6 text-center text-sm text-slate-500">
                            No attendance history is available for this student.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {isLoading
                ? "Loading student profile..."
                : "Select a student from the left panel."}
            </div>
          )}
        </section>
      </div>

      {passwordAction ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-admin-password-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="student-admin-password-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Super Admin Verification
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your password to {passwordAction.type}{" "}
                  {passwordAction.student.firstName}{" "}
                  {passwordAction.student.lastName}.
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
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
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
                disabled={isStudentActionPending}
                onClick={() => {
                  setPasswordAction(null);
                  setAdminPassword("");
                  setPasswordError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!adminPassword || isStudentActionPending}
                onClick={() => void confirmStudentPasswordAction()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isStudentActionPending ? "Verifying…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editStudent ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Edit Student
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update personal, academic, and guardian information.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["firstName", "First Name"],
                  ["middleName", "Middle Name (Optional)"],
                  ["lastName", "Last Name"],
                  ["email", "Email"],
                  ["gender", "Gender"],
                  ["studentMobileNumber", "Student Mobile Number"],
                  ["yearLevel", "Grade Level"],
                  ["sectionName", "Section"],
                  ["guardianContact", "Guardian Number"],
                  ["motherName", "Mother's Name"],
                  ["fatherName", "Father's Name"],
                  ["guardianName", "Guardian Name"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={`text-sm font-medium text-slate-600 ${key === "guardianName" ? "sm:col-span-3" : ""}`}
                >
                  {label}
                  <input
                    value={String(editStudent[key] ?? "")}
                    inputMode={
                      key === "studentMobileNumber" || key === "guardianContact"
                        ? "numeric"
                        : undefined
                    }
                    maxLength={
                      key === "studentMobileNumber" || key === "guardianContact"
                        ? 11
                        : undefined
                    }
                    onChange={(event) => {
                      const raw = event.target.value;
                      const value = studentNameFields.has(key)
                        ? formatStudentName(raw)
                        : key === "studentMobileNumber" ||
                            key === "guardianContact"
                          ? raw.replace(/\D/g, "").slice(0, 11)
                          : raw;
                      setEditStudent((current) =>
                        current ? { ...current, [key]: value } : current,
                      );
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setPendingStudentSave(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Review Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingStudentSave && editStudent ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Save Student Changes?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Save the entered changes for{" "}
              <b>
                {editStudent.firstName} {editStudent.lastName}
              </b>
              ?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isStudentActionPending}
                onClick={() => setPendingStudentSave(false)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStudentActionPending}
                onClick={() => void saveStudentChanges()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {isStudentActionPending ? "Saving…" : "Confirm Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Archive Student?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Archive{" "}
              <b>
                {pendingDelete.firstName} {pendingDelete.lastName}
              </b>
              ? The account will be deactivated and can be restored later.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isStudentActionPending}
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStudentActionPending}
                onClick={() => void confirmStudentDelete()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-40"
              >
                {isStudentActionPending ? "Archiving…" : "Archive Student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingPromotion ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="promote-student-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <ArrowUpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="promote-student-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Promote Student?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Promote{" "}
                  <b>
                    {pendingPromotion.firstName} {pendingPromotion.lastName}
                  </b>{" "}
                  from <b>{pendingPromotion.yearLevel}</b> to{" "}
                  <b>{getNextGradeLevel(pendingPromotion.yearLevel)}</b> for the
                  next enrollment?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPromoting}
                onClick={() => setPendingPromotion(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPromoting}
                onClick={() => void confirmPromotion()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {isPromoting ? "Promoting…" : "Confirm Promotion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingPromotionUndo ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="undo-promotion-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="undo-promotion-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Undo Promotion?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Restore{" "}
                  <b>
                    {pendingPromotionUndo.firstName}{" "}
                    {pendingPromotionUndo.lastName}
                  </b>{" "}
                  from <b>{pendingPromotionUndo.yearLevel}</b> to the previous
                  grade, <b>{pendingPromotionUndo.previousGradeLevel}</b>?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPromoting}
                onClick={() => setPendingPromotionUndo(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPromoting}
                onClick={() => void confirmPromotionUndo()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
              >
                {isPromoting ? "Restoring…" : "Confirm Undo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Create Student
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the student&apos;s account, academic, and guardian
                  information.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close create student"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setIsCreateOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["firstName", "First Name", "First name"],
                  ["middleName", "Middle Name (Optional)", "Middle name"],
                  ["lastName", "Last Name", "Last name"],
                  ["email", "Email", "student@example.com"],
                  ["lrn", "LRN", "Learner Reference Number"],
                  [
                    "studentMobileNumber",
                    "Student Mobile Number",
                    "11-digit mobile number",
                  ],
                  ["yearLevel", "Grade Level", "e.g. Grade 9"],
                  ["section", "Section", "e.g. Rizal"],
                  [
                    "guardianContact",
                    "Guardian Number",
                    "Guardian contact number",
                  ],
                  [
                    "guardianName",
                    "Guardian Name",
                    "Name shown in the parent account",
                  ],
                  ["motherName", "Mother's Name", "Mother's complete name"],
                  ["fatherName", "Father's Name", "Father's complete name"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label
                  key={key}
                  className={`text-sm font-medium text-slate-600 ${key === "email" ? "order-2" : key === "lrn" ? "order-4" : studentNameFields.has(key) && !["guardianName", "motherName", "fatherName"].includes(key) ? "order-1" : ["studentMobileNumber", "yearLevel", "section"].includes(key) ? "order-5" : key === "guardianName" ? "order-8" : "order-7"} ${key === "guardianName" ? "sm:col-span-3" : ""}`}
                >
                  {label}
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-slate-200"
                    placeholder={placeholder}
                    inputMode={
                      key === "studentMobileNumber" || key === "guardianContact"
                        ? "numeric"
                        : undefined
                    }
                    maxLength={
                      key === "studentMobileNumber" || key === "guardianContact"
                        ? 11
                        : undefined
                    }
                    value={newStudent[key]}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const value = studentNameFields.has(key)
                        ? formatStudentName(rawValue)
                        : key === "studentMobileNumber" ||
                            key === "guardianContact"
                          ? rawValue.replace(/\D/g, "").slice(0, 11)
                          : rawValue;
                      setNewStudent((previous) => ({
                        ...previous,
                        [key]: value,
                      }));
                    }}
                  />
                </label>
              ))}
              <label className="order-3 text-sm font-medium text-slate-600">
                Gender
                <select
                  value={newStudent.gender}
                  onChange={(event) =>
                    setNewStudent((previous) => ({
                      ...previous,
                      gender: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <label className="order-6 text-sm font-medium text-slate-600 sm:col-span-3">
                Password
                <div className="mt-1 flex rounded-xl border border-slate-200 px-3 transition-shadow focus-within:ring-2 focus-within:ring-slate-200">
                  <input
                    className="min-w-0 flex-1 py-2.5 text-sm outline-none"
                    placeholder="Enter account password"
                    type={showPassword ? "text" : "password"}
                    value={newStudent.password}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
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
              </label>
            </div>
            {createStatus ? (
              <p
                role="status"
                className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                {createStatus}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingStudent}
                onClick={async () => {
                  if (isCreatingStudent) return;
                  if (
                    !newStudent.firstName.trim() ||
                    !newStudent.lastName.trim() ||
                    !newStudent.email.trim() ||
                    !newStudent.password ||
                    !newStudent.lrn.trim() ||
                    !newStudent.studentMobileNumber ||
                    !newStudent.yearLevel.trim()
                  ) {
                    setCreateStatus(
                      "First name, last name, email, password, LRN, mobile number, and grade level are required.",
                    );
                    return;
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email)) {
                    setCreateStatus("Enter a valid email address.");
                    return;
                  }
                  if (!/^[A-Za-z0-9-]{4,32}$/.test(newStudent.lrn)) {
                    setCreateStatus(
                      "LRN must contain 4–32 letters, numbers, or hyphens.",
                    );
                    return;
                  }
                  if (!/^\d{11}$/.test(newStudent.studentMobileNumber)) {
                    setCreateStatus(
                      "Student mobile number must contain exactly 11 digits.",
                    );
                    return;
                  }
                  if (
                    newStudent.guardianContact &&
                    !/^\d{11}$/.test(newStudent.guardianContact)
                  ) {
                    setCreateStatus(
                      "Guardian number must contain exactly 11 digits.",
                    );
                    return;
                  }
                  setIsCreatingStudent(true);
                  try {
                    setCreateStatus("Creating student...");
                    await api.post("/api/students", newStudent);
                    setCreateStatus("Student created.");
                    setPromotionStatus("Student created successfully.");
                    setIsCreateOpen(false);
                    setNewStudent({
                      firstName: "",
                      middleName: "",
                      lastName: "",
                      email: "",
                      password: "",
                      lrn: "",
                      studentMobileNumber: "",
                      gender: "",
                      yearLevel: "",
                      section: "",
                      guardianName: "",
                      motherName: "",
                      fatherName: "",
                      guardianContact: "",
                    });
                    loadStudents();
                  } catch (err: unknown) {
                    const message: string =
                      typeof err === "object" &&
                      err !== null &&
                      "response" in err &&
                      typeof (
                        err as { response?: { data?: { message?: unknown } } }
                      ).response?.data?.message === "string"
                        ? ((
                            err as {
                              response?: { data?: { message?: string } };
                            }
                          ).response?.data?.message ??
                          "Failed to create student.")
                        : "Failed to create student.";
                    setCreateStatus(message);
                  } finally {
                    setIsCreatingStudent(false);
                  }
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
              >
                {isCreatingStudent ? "Creating…" : "Create Student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
