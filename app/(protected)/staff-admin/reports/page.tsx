"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  GraduationCap,
  Printer,
  Users,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import {
  AdminPanel,
  InsightState,
} from "../../admin/_components/AdminInsightsUI";

type Student = {
  id: number;
  lrn: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  yearLevel?: string | null;
  sectionName?: string | null;
  createdAt?: string;
  graduatedAt?: string | null;
  archivedAt?: string | null;
};
type ReportType = "students" | "attendance" | "enrollment" | "events";
export default function StaffAdminReportsPage() {
  const [type, setType] = useState<ReportType>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Array<Array<string | number>>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  useEffect(() => {
    api
      .get("/api/students")
      .then((studentResponse) => {
        setStudents(
          Array.isArray(studentResponse.data?.students)
            ? studentResponse.data.students
            : [],
        );
      })
      .catch(() => setStudents([]));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get(`/api/admin-reports/${type}`, {
        params: { grade, section, dateFrom, dateTo },
      })
      .then(({ data }) => {
        if (!active) return;
        setRows(Array.isArray(data?.report?.rows) ? data.report.rows : []);
        setColumns(
          Array.isArray(data?.report?.columns) ? data.report.columns : [],
        );
      })
      .catch((reason) => {
        if (!active) return;
        setRows([]);
        setColumns([]);
        setError(
          reason.response?.data?.message || "Report data could not be loaded.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, grade, section, type]);
  const gradeOptions = useMemo(
    () =>
      [
        ...new Set(students.map((item) => item.yearLevel).filter(Boolean)),
      ] as string[],
    [students],
  );
  const sectionOptions = useMemo(
    () =>
      [
        ...new Set(students.map((item) => item.sectionName).filter(Boolean)),
      ] as string[],
    [students],
  );
  const reportName = {
    students: "Student Report",
    attendance: "Attendance Report",
    enrollment: "Enrollment Report",
    events: "Meetings & Events Report",
  }[type];
  const reportCategories = [
    {
      value: "students",
      label: "Student Reports",
      icon: GraduationCap,
      iconColor: "bg-blue-50 text-blue-700",
    },
    {
      value: "attendance",
      label: "Attendance Reports",
      icon: Users,
      iconColor: "bg-emerald-50 text-emerald-700",
    },
    {
      value: "enrollment",
      label: "Enrollment Reports",
      icon: Download,
      iconColor: "bg-violet-50 text-violet-700",
    },
    {
      value: "events",
      label: "Meetings & Events",
      icon: CalendarDays,
      iconColor: "bg-amber-50 text-amber-700",
    },
  ] as const;
  const downloadExport = async (format: "pdf" | "excel" | "csv") => {
    if (exporting) return;
    setExporting(format);
    setError("");
    try {
      const response = await api.get(`/api/admin-reports/${type}/export`, {
        params: { format, grade, section, dateFrom, dateTo },
        responseType: "blob",
      });
      const disposition = String(response.headers["content-disposition"] ?? "");
      const filename =
        disposition.match(/filename="?([^";]+)"?/i)?.[1] ??
        `${type}-report.${format === "excel" ? "xls" : format}`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reason: unknown) {
      const requestError = reason as {
        response?: { data?: { message?: string } };
      };
      setError(requestError.response?.data?.message || "Report export failed.");
    } finally {
      setExporting(null);
    }
  };
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-slate-500">Reporting center</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Admin Reports
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Preview and print operational reports permitted for Admin accounts.
        </p>
      </section>
      <AdminPanel
        title="Report Categories"
        description="Choose a report to preview."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reportCategories.map(({ value, label, icon: Icon, iconColor }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`rounded-xl border bg-white p-4 text-left text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${type === value ? "border-slate-400 ring-2 ring-slate-100" : "border-slate-200"}`}
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconColor}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </AdminPanel>
      <AdminPanel
        title="Report Filters"
        description="Filters refresh the current preview."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All grade levels</option>
            {gradeOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All sections</option>
            {sectionOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <details className="group relative sm:col-span-2 lg:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-medium">Date</span>
                {dateFrom || dateTo ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {dateFrom || "Any date"} — {dateTo || "Any date"}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Date From
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Date To
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </details>
        </div>
      </AdminPanel>
      <section
        id="admin-report-preview"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">{reportName}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Total records: {rows.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pdf", "excel", "csv"] as const).map((format) => (
              <button
                key={format}
                type="button"
                disabled={Boolean(exporting) || loading}
                onClick={() => void downloadExport(format)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting === format
                  ? "Exporting…"
                  : `Export ${format === "excel" ? "Excel" : format.toUpperCase()}`}
              </button>
            ))}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
        {error ? (
          <InsightState error />
        ) : loading ? (
          <InsightState loading />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <InsightState emptyLabel="No records match the selected filters." />
        )}
      </section>
    </div>
  );
}
