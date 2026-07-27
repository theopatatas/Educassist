"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ClipboardCheck,
  Eye,
  FileText,
  History,
  EyeOff,
  LockKeyhole,
  Play,
  Plus,
  Search,
  Square,
  X,
  XCircle,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import { verifyAdminPassword } from "../_lib/admin-insights";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../_components/AdminInsightsUI";

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
  reviewedAt?: string | null;
  submittedAt: string;
  teacher?: { id: number; name: string; employeeNumber?: string | null; gradeLevel?: string | null } | null;
  affectedClasses: LeaveClass[];
  takeover?: { status?: string; startedAt?: string | null; endedAt?: string | null };
  reviewer?: { name?: string } | null;
};
type Activity = {
  id: number;
  action: string;
  details?: string | null;
  classId?: number | null;
  createdAt: string;
  user?: { name?: string; role?: string } | null;
  affectedClass?: string | null;
};
type Audit = {
  id: number;
  action: string;
  role: string;
  userName: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
};
type TeacherOption = {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  employeeNumber?: string | null;
};

const statuses = ["ALL", "PENDING", "APPROVED", "ACTIVE_LEAVE", "COMPLETED", "REJECTED", "CANCELLED"];

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
function classSchedule(value?: string | null) {
  if (!value) return { schedule: "No schedule", room: "" };
  const [day = "", storedTime = ""] = value.split(" • ");
  const [room = "", rawTime = storedTime] = storedTime.includes("|")
    ? storedTime.split("|", 2)
    : ["", storedTime];
  const time = rawTime.replace(/\s([AP])$/i, " $1M");
  return {
    schedule: [day, time].filter(Boolean).join(" • ") || "No schedule",
    room: room ? `Room ${room}` : "",
  };
}
function badge(value: string) {
  const colors: Record<string, string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
    ACTIVE_LEAVE: "border-violet-200 bg-violet-50 text-violet-700",
    ACTIVE: "border-violet-200 bg-violet-50 text-violet-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
    NOT_STARTED: "border-slate-200 bg-white text-slate-600",
  };
  return `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[value] ?? colors.NOT_STARTED}`;
}
function apiMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

export default function AdminLeaveManagementPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Leave[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Leave | null>(null);
  const [reviewOpen, setReviewOpen] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [emergency, setEmergency] = useState({
    teacherId: "",
    reason: "",
    startDate: "",
    endDate: "",
    reviewNote: "",
  });
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/leaves/admin", { params: { status, search, sort } });
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (requestError) {
      setError(apiMessage(requestError, "Leave requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [search, sort, status]);

  useEffect(() => {
    if (!accessGranted) return;
    const timeout = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [accessGranted, load, search]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const summary = useMemo(
    () => ({
      pending: requests.filter((item) => item.status === "PENDING").length,
      approved: requests.filter((item) => item.status === "APPROVED").length,
      active: requests.filter((item) => item.status === "ACTIVE_LEAVE").length,
      completed: requests.filter((item) => item.status === "COMPLETED").length,
    }),
    [requests],
  );

  const openDetails = async (leave: Leave) => {
    setSelected(leave);
    setActivities([]);
    setAudits([]);
    try {
      const [activityResponse, auditResponse] = await Promise.all([
        api.get(`/api/leaves/${leave.id}/activities`),
        api.get(`/api/leaves/admin/${leave.id}/audits`),
      ]);
      setActivities(
        Array.isArray(activityResponse.data?.activities)
          ? activityResponse.data.activities
          : [],
      );
      setAudits(
        Array.isArray(auditResponse.data?.audits)
          ? auditResponse.data.audits
          : [],
      );
    } catch {
      setActivities([]);
      setAudits([]);
    }
  };
  const review = async () => {
    if (!selected || !reviewOpen || submitting) return;
    if (reviewOpen === "reject" && !rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/api/leaves/admin/${selected.id}/${reviewOpen}`, {
        reviewNote,
        rejectionReason,
      });
      setSelected(data.leave);
      setReviewOpen(null);
      setReviewNote("");
      setRejectionReason("");
      setNotice(reviewOpen === "approve" ? "Leave approved. Takeover was not started." : "Leave request rejected.");
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "Review action failed."));
    } finally {
      setSubmitting(false);
    }
  };
  const takeoverAction = async (action: "start" | "end" | "cancel") => {
    if (!selected || submitting) return;
    const confirmation =
      action === "start"
        ? "You are about to temporarily manage this teacher's assigned classes during the approved leave period."
        : action === "end"
          ? "End this takeover and immediately restore the teacher's permissions?"
          : "Cancel this active takeover and restore the teacher's permissions?";
    if (!window.confirm(confirmation)) return;
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/api/leaves/admin/${selected.id}/takeover/${action}`);
      setSelected(data.leave);
      setNotice(action === "start" ? "Takeover activated." : action === "end" ? "Takeover completed." : "Takeover cancelled.");
      await load();
      await openDetails(data.leave);
    } catch (requestError) {
      setError(apiMessage(requestError, "Takeover action failed."));
    } finally {
      setSubmitting(false);
    }
  };
  const openEmergency = async () => {
    setEmergencyOpen(true);
    setEmergency({
      teacherId: "",
      reason: "",
      startDate: "",
      endDate: "",
      reviewNote: "",
    });
    try {
      const { data } = await api.get("/api/teachers");
      setTeacherOptions(Array.isArray(data?.teachers) ? data.teachers : []);
    } catch {
      setTeacherOptions([]);
    }
  };
  const submitEmergency = async () => {
    if (
      !emergency.teacherId ||
      !emergency.reason.trim() ||
      !emergency.startDate ||
      !emergency.endDate
    ) {
      setError("Complete the emergency takeover fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/leaves/admin/emergency", emergency);
      setEmergencyOpen(false);
      setNotice("Emergency leave and manual takeover activated.");
      await load();
    } catch (requestError) {
      setError(
        apiMessage(requestError, "Emergency takeover could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAccess = async () => {
    if (!accessPassword || verifyingAccess) return;
    setVerifyingAccess(true);
    setAccessError("");
    try {
      await verifyAdminPassword(accessPassword);
      setAccessPassword("");
      setAccessGranted(true);
    } catch (requestError) {
      setAccessError(
        apiMessage(
          requestError,
          "Super Admin password verification failed.",
        ),
      );
    } finally {
      setVerifyingAccess(false);
    }
  };

  if (!accessGranted) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1500px] items-center justify-center p-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">
            Verify Super Admin Access
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your current Super Admin password before accessing Leave
            Management.
          </p>
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyAccess();
            }}
          >
            <label className="block text-sm font-medium text-slate-700">
              Super Admin Password
              <span className="mt-1 flex h-11 items-center rounded-xl border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-slate-200">
                <input
                  type={showAccessPassword ? "text" : "password"}
                  value={accessPassword}
                  onChange={(event) => {
                    setAccessPassword(event.target.value);
                    setAccessError("");
                  }}
                  autoComplete="current-password"
                  autoFocus
                  className="min-w-0 flex-1 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessPassword((current) => !current)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label={
                    showAccessPassword ? "Hide password" : "Show password"
                  }
                >
                  {showAccessPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>
            {accessError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {accessError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.replace("/admin/dashboard")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!accessPassword || verifyingAccess}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifyingAccess ? "Verifying…" : "Verify and Continue"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer">
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError("")}><X className="h-4 w-4" /></button></div> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Review teacher leave requests and manually control temporary class
          takeovers.
        </p>
        <button type="button" onClick={() => void openEmergency()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"><Plus className="h-4 w-4" />Create Emergency Takeover</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Pending Review" value={summary.pending} description="Requests awaiting a decision" icon={ClipboardCheck} href="/admin/leave-management" loading={loading} tone="amber" />
        <AdminMetricCard label="Approved / Waiting" value={summary.approved} description="Approved leaves awaiting takeover" icon={CalendarClock} href="/admin/leave-management" loading={loading} tone="blue" />
        <AdminMetricCard label="Active Takeovers" value={summary.active} description="Temporary class access in progress" icon={Play} href="/admin/leave-management" loading={loading} tone="violet" />
        <AdminMetricCard label="Completed" value={summary.completed} description="Finished leave requests" icon={Check} href="/admin/leave-management" loading={loading} tone="emerald" />
      </div>

      <AdminPanel title="Leave Request Directory" description="Search, filter, sort, and review teacher leave requests.">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]">
          <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value.replace(/[^A-Za-z0-9 '\-]/g, ""))} placeholder="Search teacher, subject, section, or leave type" title="Letters, numbers, spaces, apostrophes, and hyphens only" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3">{statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : label(item)}</option>)}</select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="start">Start Date</option><option value="end">End Date</option></select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        {loading ? <div className="p-4"><InsightState loading /></div> : requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm [&_td]:px-5 [&_td]:py-4 [&_td]:text-center [&_td]:align-middle [&_th]:px-5 [&_th]:py-3 [&_th]:text-center">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-black"><tr><th className="whitespace-nowrap">Teacher</th><th className="whitespace-nowrap">Leave Type</th><th className="whitespace-nowrap">Period</th><th>Classes</th><th>Leave Status</th><th>Takeover</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>{requests.map((leave) => <tr key={leave.id} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="whitespace-nowrap"><b>{leave.teacher?.name || "Teacher"}</b></td><td className="whitespace-nowrap">{leave.leaveType}</td><td className="whitespace-nowrap">{leave.startDate} – {leave.endDate}<span className="ml-2 text-xs text-slate-500">· {leave.totalDays} days</span></td><td>{leave.affectedClasses.length}</td><td><span className={badge(leave.status)}>{label(leave.status)}</span></td><td><span className={badge(leave.takeover?.status ?? "NOT_STARTED")}>{label(leave.takeover?.status ?? "NOT_STARTED")}</span></td><td>{new Date(leave.submittedAt).toLocaleDateString()}</td><td><button type="button" onClick={() => void openDetails(leave)} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 hover:bg-white"><Eye className="h-4 w-4" />Review</button></td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="p-4"><InsightState emptyLabel="No leave requests are available for review." /></div>}
        </div>
      </AdminPanel>

      {selected ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><p className="font-semibold uppercase tracking-wide text-slate-400">Leave Request Details</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">{selected.teacher?.name}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Leave</p><span className={`mt-2 ${badge(selected.status)}`}>{label(selected.status)}</span></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Takeover</p><span className={`mt-2 ${badge(selected.takeover?.status ?? "NOT_STARTED")}`}>{label(selected.takeover?.status ?? "NOT_STARTED")}</span></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Employee ID</p><p className="mt-2 font-semibold">{selected.teacher?.employeeNumber || "—"}</p></div></div>
            <section className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Leave Information</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Type</dt><dd className="font-medium">{selected.leaveType}</dd></div><div><dt className="text-slate-500">Period</dt><dd className="font-medium">{selected.startDate} – {selected.endDate} ({selected.totalDays} days)</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Reason for Leave</dt><dd className="mt-1 whitespace-pre-wrap font-medium leading-6 text-slate-800">{selected.reason}</dd></div></dl>{selected.attachmentUrl ? <a target="_blank" rel="noreferrer" href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${selected.attachmentUrl}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><FileText className="h-4 w-4" />View attachment</a> : null}</section>
            <section className="mt-4 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Affected Classes</h3><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{selected.affectedClasses.reduce((total, item) => total + (item.studentCount ?? 0), 0)} total students</span></div><div className="mt-3 space-y-2">{selected.affectedClasses.length ? selected.affectedClasses.map((item) => { const displaySchedule = classSchedule(item.schedule); return <div key={item.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><b>{item.subjectName || "Subject"}</b><p className="text-slate-500">{item.gradeLevel} • {item.sectionName}</p></div><span className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-semibold text-indigo-700 shadow-sm">{item.studentCount ?? 0} students</span></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600"><p>{displaySchedule.schedule}</p>{displaySchedule.room ? <p>{displaySchedule.room}</p> : null}</div></div>; }) : <p className="text-sm text-slate-500">No affected classes.</p>}</div></section>
            {(selected.reviewNote || selected.rejectionReason || selected.reviewer) ? <section className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Review</h3>{selected.reviewNote ? <p className="mt-2 text-sm"><b>Note:</b> {selected.reviewNote}</p> : null}{selected.rejectionReason ? <p className="mt-2 text-sm text-rose-700"><b>Rejection reason:</b> {selected.rejectionReason}</p> : null}<p className="mt-2 text-xs text-slate-500">Reviewer: {selected.reviewer?.name || "—"}{selected.reviewedAt ? ` · ${new Date(selected.reviewedAt).toLocaleString()}` : ""}</p></section> : null}
            {selected.status === "PENDING" ? <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setReviewOpen("reject")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-rose-600 hover:bg-rose-50"><XCircle className="h-4 w-4" />Reject</button><button type="button" onClick={() => setReviewOpen("approve")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800"><Check className="h-4 w-4" />Approve</button></div> : null}
            {selected.status === "APPROVED" && selected.takeover?.status === "NOT_STARTED" ? <div className="mt-4 flex justify-end"><button disabled={submitting} type="button" onClick={() => void takeoverAction("start")} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700"><Play className="h-4 w-4" />Start Takeover</button></div> : null}
            {selected.takeover?.status === "ACTIVE" ? <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4"><h3 className="font-bold text-violet-900">Active Takeover</h3><p className="mt-1 text-sm text-violet-700">Temporary access applies only to the affected classes. The teacher remains the permanent class owner.</p><div className="mt-4 flex flex-wrap gap-2">{[["Open Classes", "classes"], ["Open Attendance", "attendance"], ["Open Quiz Center", "quiz-center"], ["Open Assignments", "assignment"]].map(([text, tool]) => <a key={text} href={`/admin/leave-management/${selected.id}/workspace/${tool}`} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">{text}</a>)}</div><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void takeoverAction("cancel")} className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">Cancel Takeover</button><button type="button" onClick={() => void takeoverAction("end")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"><Square className="h-4 w-4" />End Takeover</button></div></section> : null}
            <section className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><History className="h-4 w-4" />Takeover Activity History</h3><div className="mt-3 max-h-[350px] space-y-2 overflow-y-auto pr-1">{activities.length ? activities.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-medium">{label(item.action)}</p><p className="mt-1 text-xs text-slate-500">{item.details || "Activity recorded"}{item.affectedClass ? ` · ${item.affectedClass}` : ""}{item.user?.name ? ` · ${item.user.name}` : ""} · {new Date(item.createdAt).toLocaleString()}</p></div>) : <InsightState emptyLabel="No takeover activities have been recorded." />}</div></section>
            <section className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Audit Logs</h3><div className="mt-3 space-y-2">{audits.length ? audits.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-medium">{label(item.action)}</p><p className="mt-1 text-xs text-slate-500">{item.userName} · {label(item.role)} · {new Date(item.createdAt).toLocaleString()}</p></div>) : <InsightState emptyLabel="No audit logs have been recorded." />}</div></section>
          </aside>
        </div>
      ) : null}

      {reviewOpen && selected ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex justify-between gap-4"><div><h3 className="text-xl font-semibold text-slate-900">{reviewOpen === "approve" ? "Approve Leave Request" : "Reject Leave Request"}</h3><p className="mt-1 text-sm text-slate-500">{reviewOpen === "approve" ? "Approval will not automatically start a takeover." : "Provide the required reason for rejecting this request."}</p></div><button type="button" onClick={() => setReviewOpen(null)} className="h-fit rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><label className="mt-5 block font-medium text-slate-600">Review Note (optional)<textarea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Add a note for the teacher" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-200" /></label>{reviewOpen === "reject" ? <label className="mt-4 block font-medium text-slate-600">Rejection Reason<textarea rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explain why this request is being rejected" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-200" /></label> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setReviewOpen(null)} className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50">Cancel</button><button type="button" disabled={submitting} onClick={() => void review()} className={`rounded-xl px-4 py-2 font-medium text-white disabled:opacity-40 ${reviewOpen === "approve" ? "bg-slate-900 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}`}>{submitting ? "Processing…" : "Confirm"}</button></div></section>
        </div>
      ) : null}

      {emergencyOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <section className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex justify-between gap-4"><div><h3 className="text-xl font-semibold text-slate-900">Create Emergency Takeover</h3><p className="mt-1 text-slate-500">Create approved emergency leave and immediately activate temporary class access.</p></div><button type="button" onClick={() => setEmergencyOpen(false)} className="h-fit rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="font-medium text-slate-600 sm:col-span-2">Teacher<select value={emergency.teacherId} onChange={(event) => setEmergency((current) => ({ ...current, teacherId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:ring-2 focus:ring-slate-200"><option value="">Select teacher</option>{teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{[teacher.firstName, teacher.middleName, teacher.lastName].filter(Boolean).join(" ")}{teacher.employeeNumber ? ` · ${teacher.employeeNumber}` : ""}</option>)}</select></label>
              <label className="font-medium text-slate-600">Start Date<input type="date" value={emergency.startDate} onChange={(event) => setEmergency((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200" /></label>
              <label className="font-medium text-slate-600">End Date<input type="date" min={emergency.startDate} value={emergency.endDate} onChange={(event) => setEmergency((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200" /></label>
              <label className="font-medium text-slate-600 sm:col-span-2">Reason<textarea rows={3} value={emergency.reason} onChange={(event) => setEmergency((current) => ({ ...current, reason: event.target.value }))} placeholder="Explain the emergency absence" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-200" /></label>
              <label className="font-medium text-slate-600 sm:col-span-2">Review Note (optional)<textarea rows={2} value={emergency.reviewNote} onChange={(event) => setEmergency((current) => ({ ...current, reviewNote: event.target.value }))} placeholder="Add an internal review note" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-200" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEmergencyOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50">Cancel</button><button type="button" disabled={submitting} onClick={() => void submitEmergency()} className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50">{submitting ? "Activating…" : "Confirm and Activate"}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
