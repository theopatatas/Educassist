"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  RefreshCw,
  Scale,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import AcademicDashboardBadges from "../../AcademicDashboardBadges";
import { useParentStudent } from "../ParentStudentContext";

type DisciplinaryRecord = {
  id: number;
  academicYear: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  actionTaken?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

type RecordsResponse = {
  records: DisciplinaryRecord[];
  currentAcademicYear: string | null;
  currentYearCount: number;
  currentYearActiveCount: number;
  historicalCount: number;
  academicYears: string[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ARCHIVED"];
const SEVERITIES = ["MINOR", "MODERATE", "MAJOR", "CRITICAL"];

function readable(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requestMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return "Disciplinary records could not be loaded.";
}

export default function ParentDisciplinaryRecordsPage() {
  const {
    selectedStudent,
    selectedStudentId,
    loading: studentsLoading,
    error: studentsError,
  } = useParentStudent();
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [academicYear, setAcademicYear] = useState("CURRENT");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [incidentType, setIncidentType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] =
    useState<DisciplinaryRecord | null>(null);

  const loadRecords = useCallback(async () => {
    if (!selectedStudentId || studentsLoading) {
      if (!studentsLoading) setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        studentId: selectedStudentId,
        page,
        pageSize: 10,
      };
      if (academicYear === "CURRENT" && data?.currentAcademicYear)
        params.academicYear = data.currentAcademicYear;
      else if (academicYear !== "CURRENT")
        params.academicYear = academicYear;
      if (status !== "ALL") params.status = status;
      if (severity !== "ALL") params.severity = severity;
      if (incidentType !== "ALL") params.incidentType = incidentType;
      const response = await api.get("/api/parents/disciplinary-records", {
        params,
      });
      setData(response.data as RecordsResponse);
    } catch (loadError: unknown) {
      setData(null);
      setError(requestMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [
    academicYear,
    data?.currentAcademicYear,
    incidentType,
    page,
    selectedStudentId,
    severity,
    status,
    studentsLoading,
  ]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setPage(1);
    setSelectedRecord(null);
  }, [academicYear, incidentType, selectedStudentId, severity, status]);

  const yearOptions = useMemo(() => {
    const years = new Set(data?.academicYears ?? []);
    if (data?.currentAcademicYear) years.add(data.currentAcademicYear);
    return [...years].sort().reverse();
  }, [data]);
  const incidentTypes = useMemo(
    () => [...new Set(data?.records.map((record) => record.incidentType) ?? [])].sort(),
    [data],
  );

  const badge = (value: string, category: "status" | "severity") => {
    const color =
      category === "status"
        ? {
            OPEN: "bg-rose-50 text-rose-700",
            UNDER_REVIEW: "bg-amber-50 text-amber-700",
            RESOLVED: "bg-emerald-50 text-emerald-700",
            ARCHIVED: "bg-slate-100 text-slate-600",
          }[value]
        : {
            MINOR: "bg-sky-50 text-sky-700",
            MODERATE: "bg-amber-50 text-amber-700",
            MAJOR: "bg-orange-50 text-orange-700",
            CRITICAL: "bg-rose-50 text-rose-700",
          }[value];
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color ?? "bg-slate-100 text-slate-600"}`}
      >
        {readable(value)}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Parent Portal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Disciplinary Records
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              View the current and previous Academic Year records for your
              selected child.
            </p>
            <div className="mt-4">
              <AcademicDashboardBadges />
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 sm:h-14 sm:w-14">
            <Scale className="h-7 w-7" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Currently Viewing</p>
            <p className="truncate font-semibold text-slate-900">
              {selectedStudent
                ? [
                    selectedStudent.name,
                    selectedStudent.gradeLevel,
                    selectedStudent.sectionName,
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : "No linked student selected"}
            </p>
          </div>
        </div>
      </section>

      {studentsError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {studentsError}
        </p>
      ) : null}

      {selectedStudentId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: BookOpenCheck,
                label: "Current Academic Year",
                value: data?.currentAcademicYear || "Not set",
                detail: `${data?.currentYearCount ?? 0} record(s)`,
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                icon: AlertTriangle,
                label: "Current Active Records",
                value: String(data?.currentYearActiveCount ?? 0),
                detail: "Open or under review",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Clock3,
                label: "Previous Records",
                value: String(data?.historicalCount ?? 0),
                detail: "Preserved history",
                color: "bg-slate-100 text-slate-600",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className={`inline-flex rounded-lg p-2 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {item.value}
                </p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="CURRENT">Current Academic Year</option>
              <option value="ALL">All Academic Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {readable(value)}
                </option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="ALL">All Severities</option>
              {SEVERITIES.map((value) => (
                <option key={value} value={value}>
                  {readable(value)}
                </option>
              ))}
            </select>
            <select
              value={incidentType}
              onChange={(event) => setIncidentType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="ALL">All Incident Types</option>
              {incidentTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadRecords()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : !data?.records.length ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-7 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 font-semibold text-slate-800">
                No disciplinary records found.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                No records match the selected Academic Year and filters.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {data.records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                  className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {record.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.incidentType} ·{" "}
                      {new Date(
                        `${record.incidentDate}T00:00:00`,
                      ).toLocaleDateString()}{" "}
                      · {record.academicYear}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {badge(record.severity, "severity")}
                    {badge(record.status, "status")}
                    <Eye className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {data && data.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-500">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>
      ) : !studentsLoading ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <Scale className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-800">
            No linked student selected
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Select a linked child to view disciplinary records.
          </p>
        </section>
      ) : null}

      {selectedRecord ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedRecord(null)
          }
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {selectedRecord.academicYear} ·{" "}
                  {selectedRecord.incidentType}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedRecord.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close record details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {badge(selectedRecord.severity, "severity")}
              {badge(selectedRecord.status, "status")}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Incident Date
                </p>
                <p className="mt-1 font-medium">
                  {new Date(
                    `${selectedRecord.incidentDate}T00:00:00`,
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Status
                </p>
                <p className="mt-1 font-medium">
                  {readable(selectedRecord.status)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Description
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedRecord.description}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Action Taken
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedRecord.actionTaken || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Resolution Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedRecord.resolutionNotes || "—"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
