"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";

type RecordStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "ARCHIVED";
type Severity = "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
type DisciplinaryRecord = {
  id: number;
  academicYear: string;
  incidentDate: string;
  incidentType: string;
  severity: Severity;
  status: RecordStatus;
  title: string;
  description: string;
  actionTaken?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  archivedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
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

const INCIDENT_TYPES = [
  "Behavioral",
  "Attendance",
  "Academic Misconduct",
  "Bullying",
  "Property Damage",
  "Safety",
  "Other",
];
const SEVERITIES: Severity[] = ["MINOR", "MODERATE", "MAJOR", "CRITICAL"];
const STATUSES: RecordStatus[] = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ARCHIVED"];
const EMPTY_FORM = {
  incidentDate: "",
  incidentType: "",
  severity: "" as Severity | "",
  title: "",
  description: "",
  actionTaken: "",
  resolutionNotes: "",
};

function readable(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function messageFrom(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
  }
  return fallback;
}

export function StudentDisciplinaryRecords({
  studentId,
  studentName,
}: {
  studentId: number;
  studentName: string;
}) {
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [academicYear, setAcademicYear] = useState("CURRENT");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [incidentType, setIncidentType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DisciplinaryRecord | "new" | null>(null);
  const [viewing, setViewing] = useState<DisciplinaryRecord | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    record: DisciplinaryRecord;
    status: "RESOLVED" | "ARCHIVED";
  } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, pageSize: 10 };
      if (academicYear === "CURRENT" && data?.currentAcademicYear)
        params.academicYear = data.currentAcademicYear;
      else if (academicYear !== "CURRENT") params.academicYear = academicYear;
      if (status !== "ALL") params.status = status;
      if (severity !== "ALL") params.severity = severity;
      if (incidentType !== "ALL") params.incidentType = incidentType;
      const response = await api.get(`/api/students/${studentId}/disciplinary-records`, { params });
      setData(response.data as RecordsResponse);
    } catch (requestError: unknown) {
      setError(messageFrom(requestError, "Disciplinary records could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [academicYear, data?.currentAcademicYear, incidentType, page, severity, status, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [academicYear, status, severity, incidentType, studentId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const isHistoricalFilter =
    academicYear !== "CURRENT" &&
    academicYear !== "ALL" &&
    academicYear !== data?.currentAcademicYear;
  const yearOptions = useMemo(() => {
    const values = new Set(data?.academicYears ?? []);
    if (data?.currentAcademicYear) values.add(data.currentAcademicYear);
    return [...values].sort().reverse();
  }, [data]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, incidentDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setEditing("new");
  };
  const openEdit = (record: DisciplinaryRecord) => {
    setForm({
      incidentDate: record.incidentDate,
      incidentType: record.incidentType,
      severity: record.severity,
      title: record.title,
      description: record.description,
      actionTaken: record.actionTaken ?? "",
      resolutionNotes: record.resolutionNotes ?? "",
    });
    setFormError("");
    setEditing(record);
  };

  const submit = async () => {
    if (
      !form.incidentDate ||
      !form.incidentType ||
      !form.severity ||
      !form.title.trim() ||
      !form.description.trim()
    ) {
      setFormError("Complete all required fields.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing === "new") {
        await api.post(`/api/students/${studentId}/disciplinary-records`, form);
        setNotice("Disciplinary record added successfully.");
      } else if (editing) {
        await api.patch(
          `/api/students/${studentId}/disciplinary-records/${editing.id}`,
          form,
        );
        setNotice("Disciplinary record updated successfully.");
      }
      setEditing(null);
      await load();
    } catch (requestError: unknown) {
      setFormError(messageFrom(requestError, "The disciplinary record could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    try {
      await api.patch(
        `/api/students/${studentId}/disciplinary-records/${pendingStatus.record.id}`,
        { status: pendingStatus.status },
      );
      setPendingStatus(null);
      setViewing(null);
      setNotice(
        pendingStatus.status === "RESOLVED"
          ? "Disciplinary record marked as resolved."
          : "Disciplinary record archived.",
      );
      await load();
    } catch (requestError: unknown) {
      setError(messageFrom(requestError, "The record status could not be updated."));
    } finally {
      setSaving(false);
    }
  };

  const badge = (value: string, kind: "status" | "severity") => {
    const colors =
      kind === "severity"
        ? {
            MINOR: "bg-sky-50 text-sky-700",
            MODERATE: "bg-amber-50 text-amber-700",
            MAJOR: "bg-orange-50 text-orange-700",
            CRITICAL: "bg-rose-50 text-rose-700",
          }
        : {
            OPEN: "bg-rose-50 text-rose-700",
            UNDER_REVIEW: "bg-amber-50 text-amber-700",
            RESOLVED: "bg-emerald-50 text-emerald-700",
            ARCHIVED: "bg-slate-100 text-slate-600",
          };
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value as keyof typeof colors]}`}>
        {readable(value)}
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            <h4 className="text-lg font-semibold text-slate-900">Disciplinary Records</h4>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Current and historical incidents grouped by Academic Year.
          </p>
        </div>
        <button
          type="button"
          disabled={!data?.currentAcademicYear}
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
          <div key={item.label} className="rounded-xl border border-slate-200 p-3.5">
            <div className={`inline-flex rounded-lg p-2 ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="CURRENT">Current Academic Year</option>
          <option value="ALL">All Academic Years</option>
          {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="ALL">All Statuses</option>
          {STATUSES.map((value) => <option key={value} value={value}>{readable(value)}</option>)}
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="ALL">All Severities</option>
          {SEVERITIES.map((value) => <option key={value} value={value}>{readable(value)}</option>)}
        </select>
        <select value={incidentType} onChange={(event) => setIncidentType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="ALL">All Incident Types</option>
          {INCIDENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {isHistoricalFilter ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Historical Academic Year records are protected and read-only.
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-sm text-rose-700">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : !data?.records.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-7 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 font-semibold text-slate-800">No disciplinary records found.</p>
          <p className="mt-1 text-sm text-slate-500">
            {academicYear === "CURRENT"
              ? `${studentName} has a clean record for the current Academic Year.`
              : "No records match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.records.map((record) => {
            const historical = record.academicYear !== data.currentAcademicYear;
            return (
              <button
                key={record.id}
                type="button"
                onClick={() => setViewing(record)}
                className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{record.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.incidentType} · {new Date(`${record.incidentDate}T00:00:00`).toLocaleDateString()} · {record.academicYear}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {badge(record.severity, "severity")}
                    {badge(record.status, "status")}
                    {historical ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Historical</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-slate-500">Page {data.page} of {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && setViewing(null)}>
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{viewing.academicYear} · {viewing.incidentType}</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{viewing.title}</h3>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{badge(viewing.severity, "severity")}{badge(viewing.status, "status")}</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Incident Date</p><p className="mt-1 font-medium">{new Date(`${viewing.incidentDate}T00:00:00`).toLocaleDateString()}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Recorded By</p><p className="mt-1 font-medium">{viewing.createdBy || "Super Admin"}</p></div>
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2"><p className="text-xs font-semibold uppercase text-slate-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewing.description}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Action Taken</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewing.actionTaken || "—"}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Resolution Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewing.resolutionNotes || "—"}</p></div>
            </div>
            {viewing.academicYear === data?.currentAcademicYear && viewing.status !== "ARCHIVED" ? (
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { setViewing(null); openEdit(viewing); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Pencil className="h-4 w-4" /> Edit</button>
                {viewing.status !== "RESOLVED" ? <button type="button" onClick={() => setPendingStatus({ record: viewing, status: "RESOLVED" })} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /> Mark Resolved</button> : null}
                <button type="button" onClick={() => setPendingStatus({ record: viewing, status: "ARCHIVED" })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Archive className="h-4 w-4" /> Archive</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{data?.currentAcademicYear}</p><h3 className="mt-1 text-xl font-semibold">{editing === "new" ? "Add Disciplinary Record" : "Edit Disciplinary Record"}</h3></div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Incident Title *<input value={form.title} maxLength={160} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Enter a concise incident title" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400" /></label>
              <label className="text-sm font-medium text-slate-700">Incident Date *<input type="date" value={form.incidentDate} onChange={(event) => setForm((value) => ({ ...value, incidentDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400" /></label>
              <label className="text-sm font-medium text-slate-700">Incident Type *<select value={form.incidentType} onChange={(event) => setForm((value) => ({ ...value, incidentType: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select incident type</option>{INCIDENT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Severity *<select value={form.severity} onChange={(event) => setForm((value) => ({ ...value, severity: event.target.value as Severity }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select severity</option>{SEVERITIES.map((value) => <option key={value} value={value}>{readable(value)}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Description *<textarea rows={4} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Describe what happened using factual details" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400" /></label>
              <label className="text-sm font-medium text-slate-700">Action Taken<textarea rows={3} value={form.actionTaken} onChange={(event) => setForm((value) => ({ ...value, actionTaken: event.target.value }))} placeholder="Document the intervention or action taken" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400" /></label>
              <label className="text-sm font-medium text-slate-700">Resolution Notes<textarea rows={3} value={form.resolutionNotes} onChange={(event) => setForm((value) => ({ ...value, resolutionNotes: event.target.value }))} placeholder="Add follow-up or resolution details" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400" /></label>
            </div>
            {formError ? <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button><button type="button" disabled={saving} onClick={() => void submit()} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">{saving ? "Saving…" : "Save Record"}</button></div>
          </div>
        </div>
      ) : null}

      {pendingStatus ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">{pendingStatus.status === "RESOLVED" ? "Resolve Record" : "Archive Record"}</h3>
            <p className="mt-2 text-sm text-slate-600">Confirm this action for <b>{pendingStatus.record.title}</b>. The record remains in the student&apos;s permanent Academic Year history.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPendingStatus(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="button" disabled={saving} onClick={() => void changeStatus()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Processing…" : "Confirm"}</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
