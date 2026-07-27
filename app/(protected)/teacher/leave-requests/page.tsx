"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Clock3,
  Eye,
  FileText,
  History,
  Pencil,
  Plus,
  School,
  Send,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";

type LeaveClass = {
  id: number;
  classId: number;
  subjectName?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  schedule?: string | null;
  studentCount?: number;
};
type Leave = {
  id: number;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  attachmentUrl?: string | null;
  reviewNote?: string | null;
  rejectionReason?: string | null;
  submittedAt: string;
  affectedClasses: LeaveClass[];
  takeover?: { status?: string };
};
type Activity = {
  id: number;
  action: string;
  details?: string | null;
  classId?: number | null;
  createdAt: string;
  user?: { name?: string } | null;
  affectedClass?: string | null;
};

const leaveTypes = [
  "Sick Leave",
  "Vacation Leave",
  "Emergency Leave",
  "Official Business",
  "Maternity Leave",
  "Paternity Leave",
  "Bereavement Leave",
  "Other",
];
const filters = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ACTIVE_LEAVE",
  "COMPLETED",
];
const emptyForm = {
  leaveType: "",
  reason: "",
  startDate: "",
  endDate: "",
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function badge(value: string) {
  const colors: Record<string, string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
    ACTIVE_LEAVE: "border-violet-200 bg-violet-50 text-violet-700",
    ACTIVE: "border-violet-200 bg-violet-50 text-violet-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    NOT_STARTED: "border-slate-200 bg-white text-slate-600",
  };
  return `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[value] ?? colors.NOT_STARTED}`;
}

function apiMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
    fallback
  );
}

export default function TeacherLeaveRequestsPage() {
  const [requests, setRequests] = useState<Leave[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [selected, setSelected] = useState<Leave | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/leaves/teacher");
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (requestError) {
      setError(apiMessage(requestError, "Leave requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const visible = useMemo(
    () => requests.filter((item) => filter === "ALL" || item.status === filter),
    [filter, requests],
  );
  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(`${form.startDate}T00:00:00`).getTime();
    const end = new Date(`${form.endDate}T00:00:00`).getTime();
    return end >= start ? Math.floor((end - start) / 86_400_000) + 1 : 0;
  }, [form.endDate, form.startDate]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setAttachment(null);
    setFormOpen(true);
  };
  const openEdit = (leave: Leave) => {
    setEditing(leave);
    setForm({
      leaveType: leave.leaveType,
      reason: leave.reason,
      startDate: leave.startDate,
      endDate: leave.endDate,
    });
    setAttachment(null);
    setFormOpen(true);
  };
  const openDetails = async (leave: Leave) => {
    setSelected(leave);
    setActivities([]);
    setActivitiesLoading(true);
    try {
      const { data } = await api.get(`/api/leaves/${leave.id}/activities`);
      setActivities(Array.isArray(data?.activities) ? data.activities : []);
    } finally {
      setActivitiesLoading(false);
    }
  };
  const submit = async () => {
    if (!form.leaveType || !form.reason.trim() || !form.startDate || !form.endDate) {
      setError("Complete all required leave fields.");
      return;
    }
    if (!totalDays) {
      setError("End date must be on or after the start date.");
      return;
    }
    setSubmitting(true);
    setError("");
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (attachment) data.append("attachment", attachment);
    try {
      if (editing) {
        await api.patch(`/api/leaves/teacher/${editing.id}`, data);
        setNotice("Leave request updated successfully.");
      } else {
        await api.post("/api/leaves/teacher", data);
        setNotice("Leave request submitted successfully.");
      }
      setFormOpen(false);
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "Leave request could not be saved."));
    } finally {
      setSubmitting(false);
    }
  };
  const cancelRequest = async (leave: Leave) => {
    if (!window.confirm(`Cancel your pending ${leave.leaveType} request?`)) return;
    try {
      await api.patch(`/api/leaves/teacher/${leave.id}/cancel`);
      setNotice("Leave request cancelled.");
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "Leave request could not be cancelled."));
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError("")}><X className="h-4 w-4" /></button></div> : null}

      <section className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Leave Requests</h1>
          <p className="mt-1 text-gray-500">Notify the Super Admin and track approval and takeover status</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 sm:w-auto"><Plus className="h-5 w-5" />Submit Leave Request</button>
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${filter === item ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{item === "ALL" ? "All" : label(item)}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}</div>
      ) : visible.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((leave) => (
            <article key={leave.id} className="group flex min-h-80 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className={badge(leave.status)}>{label(leave.status)}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800 transition-colors group-hover:text-indigo-600">{leave.leaveType}</h3>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-gray-500">{leave.reason}</p>
              <div className="mt-5 space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3"><CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div><p>{leave.startDate} – {leave.endDate}</p><p className="text-xs text-gray-400">{leave.totalDays} leave {leave.totalDays === 1 ? "day" : "days"}</p></div></div>
                <div className="flex items-center gap-3"><School className="h-4 w-4 shrink-0 text-gray-400" /><span>{leave.affectedClasses.length} affected {leave.affectedClasses.length === 1 ? "class" : "classes"}</span></div>
                <div className="flex items-center gap-3"><Clock3 className="h-4 w-4 shrink-0 text-gray-400" /><span>Submitted {new Date(leave.submittedAt).toLocaleDateString()}</span></div>
              </div>
              <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-gray-500">Takeover Status</span><span className={badge(leave.takeover?.status ?? "NOT_STARTED")}>{label(leave.takeover?.status ?? "NOT_STARTED")}</span></div>
              </div>
              <div className="mt-auto flex gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => void openDetails(leave)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-50 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"><Eye className="h-4 w-4" />View</button>
                {leave.status === "PENDING" ? <><button type="button" onClick={() => openEdit(leave)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-50 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={() => void cancelRequest(leave)} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50" aria-label="Cancel leave request">Cancel</button></> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><CalendarDays className="h-6 w-6" /></span><p className="mt-4 font-semibold text-slate-700">No leave requests found.</p><p className="mt-1 text-sm text-slate-500">Submit a leave request to notify the Super Admin about an upcoming absence.</p></section>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3">
          <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">{editing ? "Edit Leave Request" : "Submit Leave Request"}</h2><p className="mt-1 text-sm text-slate-500">Your currently assigned classes will be detected automatically.</p></div><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Leave Type<select value={form.leaveType} onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="">Select leave type</option>{leaveTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Total Leave Days<input value={totalDays || ""} readOnly placeholder="Calculated automatically" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
              <label className="text-sm font-medium text-slate-700">Start Date<input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-medium text-slate-700">End Date<input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Reason<textarea rows={4} value={form.reason} placeholder="Explain the reason for your leave request" onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Attachment (optional)<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-xl border border-slate-200 p-2.5 text-sm" /><span className="mt-1 block text-xs text-slate-500">PDF, DOC, DOCX, JPG, JPEG, or PNG. Maximum 10 MB.</span></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm hover:bg-slate-50">Cancel</button><button type="button" disabled={submitting} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Send className="h-4 w-4" />{submitting ? "Submitting…" : editing ? "Save Changes" : "Submit"}</button></div>
          </section>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">Leave Request</p><h2 className="text-2xl font-bold">{selected.leaveType}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Leave Status</p><span className={`mt-2 ${badge(selected.status)}`}>{label(selected.status)}</span></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Takeover Status</p><span className={`mt-2 ${badge(selected.takeover?.status ?? "NOT_STARTED")}`}>{label(selected.takeover?.status ?? "NOT_STARTED")}</span></div></div>
            <section className="mt-4 rounded-2xl border p-4"><h3 className="font-bold">Leave Information</h3><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selected.reason}</p><p className="mt-3 text-sm"><b>Dates:</b> {selected.startDate} – {selected.endDate} ({selected.totalDays} days)</p>{selected.attachmentUrl ? <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${selected.attachmentUrl}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><FileText className="h-4 w-4" />View attachment</a> : null}</section>
            <section className="mt-4 rounded-2xl border p-4"><h3 className="font-bold">Affected Classes</h3><div className="mt-3 space-y-2">{selected.affectedClasses.length ? selected.affectedClasses.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{item.subjectName || "Subject"}</b><p className="mt-1 text-slate-500">{[item.gradeLevel, item.sectionName, item.schedule].filter(Boolean).join(" • ")}</p></div>) : <p className="text-sm text-slate-500">No affected classes were detected.</p>}</div></section>
            {(selected.reviewNote || selected.rejectionReason) ? <section className="mt-4 rounded-2xl border p-4"><h3 className="font-bold">Review</h3>{selected.reviewNote ? <p className="mt-2 text-sm"><b>Review note:</b> {selected.reviewNote}</p> : null}{selected.rejectionReason ? <p className="mt-2 text-sm text-rose-700"><b>Rejection reason:</b> {selected.rejectionReason}</p> : null}</section> : null}
            <section className="mt-4 rounded-2xl border p-4"><h3 className="flex items-center gap-2 font-bold"><History className="h-4 w-4" />Takeover Activity</h3><div className="mt-3 max-h-[350px] space-y-2 overflow-y-auto pr-1">{activitiesLoading ? <p className="text-sm text-slate-500">Loading activities…</p> : activities.length ? activities.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium">{label(item.action)}</p><p className="mt-1 text-xs text-slate-500">{item.details || "Activity recorded"}{item.affectedClass ? ` · ${item.affectedClass}` : ""}{item.user?.name ? ` · ${item.user.name}` : ""} · {new Date(item.createdAt).toLocaleString()}</p></div>) : <p className="text-sm text-slate-500">No takeover activities have been recorded.</p>}</div></section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
