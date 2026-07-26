"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  BookOpenCheck,
  ClipboardCheck,
  FilePlus2,
  Megaphone,
  Save,
  Upload,
} from "lucide-react";
import { api } from "@/src/lib/http/client";

type WorkspaceClass = {
  classId: number;
  subjectName?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  schedule?: string | null;
};
type Student = { id: number; firstName: string; lastName: string };
type Attendance = {
  classId: number;
  studentId: number;
  status: "present" | "late" | "absent";
};
type Assignment = {
  id: number;
  classId: number;
  title: string;
  dueDate: string;
  status: string;
};
type Workspace = {
  leave: {
    id: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    teacher?: { name?: string } | null;
    takeover?: { startedAt?: string | null; endedAt?: string | null };
  };
  classes: WorkspaceClass[];
  studentsByClass: Record<string, Student[]>;
  attendance: Attendance[];
  assignments: Assignment[];
};

const tools = [
  ["attendance", "Attendance", ClipboardCheck],
  ["gradebook", "Gradebook", BookOpenCheck],
  ["assignments", "Assignments", FilePlus2],
  ["announcements", "Announcements", Megaphone],
  ["materials", "Learning Materials", Upload],
] as const;

function apiMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

export default function TakeoverWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [tool, setTool] = useState(searchParams.get("tool") || "attendance");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState("");
  const [attendance, setAttendance] = useState<Record<number, "present" | "late" | "absent">>({});
  const [assignment, setAssignment] = useState({ title: "", description: "", dueDate: "" });
  const [term, setTerm] = useState("1st Grading");
  const [grades, setGrades] = useState<Record<number, number>>({});
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/api/leaves/admin/${params.id}/workspace`, { params: { date, tool } });
      const next = data.workspace as Workspace;
      setWorkspace(next);
      setClassId((current) => current || String(next.classes[0]?.classId ?? ""));
    } catch (requestError) {
      setError(apiMessage(requestError, "Active takeover workspace could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [date, params.id, tool]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedClass = useMemo(
    () =>
      workspace?.classes.find((item) => String(item.classId) === classId),
    [classId, workspace],
  );
  const remainingDays = useMemo(() => {
    if (!workspace?.leave.endDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(`${workspace.leave.endDate}T00:00:00`);
    return Math.max(
      0,
      Math.floor((end.getTime() - today.getTime()) / 86_400_000) + 1,
    );
  }, [workspace?.leave.endDate]);
  const students = useMemo(
    () => (workspace && classId ? workspace.studentsByClass[classId] ?? [] : []),
    [classId, workspace],
  );
  useEffect(() => {
    if (!workspace || !classId) return;
    const values: Record<number, "present" | "late" | "absent"> = {};
    students.forEach((student) => {
      values[student.id] =
        workspace.attendance.find(
          (item) =>
            Number(item.classId) === Number(classId) &&
            Number(item.studentId) === Number(student.id),
        )?.status ?? "present";
    });
    setAttendance(values);
  }, [classId, students, workspace]);

  const saveAttendance = async () => {
    setSaving(true);
    try {
      await api.post(`/api/leaves/admin/${params.id}/workspace/attendance`, {
        date,
        records: students.map((student) => ({
          classId: Number(classId),
          studentId: student.id,
          status: attendance[student.id] ?? "present",
        })),
      });
      setNotice("Attendance saved and recorded in takeover activity.");
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "Attendance could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const createAssignment = async () => {
    setSaving(true);
    try {
      await api.post(`/api/leaves/admin/${params.id}/workspace/assignments`, {
        classId: Number(classId),
        ...assignment,
      });
      setAssignment({ title: "", description: "", dueDate: "" });
      setNotice("Assignment created and recorded in takeover activity.");
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "Assignment could not be created."));
    } finally {
      setSaving(false);
    }
  };

  const loadGrades = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const { data } = await api.get(`/api/leaves/admin/${params.id}/workspace/grades`, {
        params: {
          section: selectedClass.sectionName,
          gradeLevel: selectedClass.gradeLevel,
          subject: selectedClass.subjectName,
          term,
        },
      });
      setGrades(
        Object.fromEntries(
          (Array.isArray(data?.rows) ? data.rows : []).map(
            (row: { studentId: number; score: number }) => [row.studentId, row.score],
          ),
        ),
      );
      setPublished(Boolean(data?.published));
    } catch (requestError) {
      setError(apiMessage(requestError, "Grades could not be loaded."));
    }
  }, [params.id, selectedClass, term]);
  useEffect(() => {
    if (tool === "gradebook" && selectedClass) void loadGrades();
  }, [loadGrades, selectedClass, tool]);

  const saveGrades = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      await api.post(`/api/leaves/admin/${params.id}/workspace/grades`, {
        section: selectedClass.sectionName,
        gradeLevel: selectedClass.gradeLevel,
        subject: selectedClass.subjectName,
        term,
        publish: published,
        rows: students.map((student) => ({
          studentId: student.id,
          score: Number(grades[student.id] ?? 0),
        })),
      });
      setNotice("Grades saved and recorded in takeover activity.");
    } catch (requestError) {
      setError(apiMessage(requestError, "Grades could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6"><p className="text-sm text-slate-500">Active Takeover Workspace</p><h2 className="mt-1 text-2xl font-bold">{workspace?.leave.teacher?.name || "Teacher Classes"}</h2><p className="mt-2 text-sm text-slate-600">{workspace?.leave.leaveType} · {workspace?.leave.startDate} – {workspace?.leave.endDate}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Takeover Start</p><b className="mt-1 block text-sm">{workspace?.leave.takeover?.startedAt ? new Date(workspace.leave.takeover.startedAt).toLocaleString() : "—"}</b></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Takeover End</p><b className="mt-1 block text-sm">{workspace?.leave.endDate || "—"}</b></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-xs text-violet-600">Remaining Days</p><b className="mt-1 block text-sm text-violet-800">{remainingDays}</b></div></div></section>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">{tools.map(([value, title, Icon]) => <button key={value} type="button" onClick={() => setTool(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${tool === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{title}</button>)}</div>
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Affected Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-white px-3">{workspace?.classes.map((item) => <option key={item.classId} value={item.classId}>{item.subjectName} · {item.gradeLevel} · {item.sectionName}</option>)}</select></label>
          {tool === "attendance" ? <label className="text-sm font-medium">Attendance Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label> : null}
          {tool === "gradebook" ? <label className="text-sm font-medium">Grading Period<select value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-white px-3"><option>1st Grading</option><option>2nd Grading</option><option>3rd Grading</option><option>4th Grading</option></select></label> : null}
        </div>
      </section>
      {tool === "attendance" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Attendance</h3><div className="mt-4 space-y-2">{students.length ? students.map((student) => <div key={student.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="font-medium">{student.lastName}, {student.firstName}</p><select value={attendance[student.id] ?? "present"} onChange={(event) => setAttendance((current) => ({ ...current, [student.id]: event.target.value as "present" | "late" | "absent" }))} className="h-10 rounded-xl border bg-white px-3"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select></div>) : <p className="text-sm text-slate-500">No students are assigned to this class.</p>}</div><button disabled={!students.length || saving} type="button" onClick={() => void saveAttendance()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white disabled:opacity-40"><Save className="h-4 w-4" />Save Attendance</button></section> : null}
      {tool === "gradebook" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold">Gradebook</h3><label className="text-sm"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="mr-2" />Publish grades</label></div><div className="mt-4 space-y-2">{students.length ? students.map((student) => <label key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="font-medium">{student.lastName}, {student.firstName}</span><input type="number" min={0} max={100} value={grades[student.id] ?? 0} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setGrades((current) => ({ ...current, [student.id]: Number(event.target.value) }))} className="h-10 w-24 rounded-xl border bg-white px-3 text-center" /></label>) : <p className="text-sm text-slate-500">No students are assigned to this class.</p>}</div><button disabled={!students.length || saving} type="button" onClick={() => void saveGrades()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white disabled:opacity-40"><Save className="h-4 w-4" />Save Grades</button></section> : null}
      {tool === "assignments" ? <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Create Assignment</h3><div className="mt-4 space-y-3"><input value={assignment.title} onChange={(event) => setAssignment((current) => ({ ...current, title: event.target.value }))} placeholder="Assignment title" className="h-11 w-full rounded-xl border px-3" /><textarea rows={3} value={assignment.description} onChange={(event) => setAssignment((current) => ({ ...current, description: event.target.value }))} placeholder="Instructions" className="w-full rounded-xl border px-3 py-2" /><input type="date" value={assignment.dueDate} onChange={(event) => setAssignment((current) => ({ ...current, dueDate: event.target.value }))} className="h-11 w-full rounded-xl border px-3" /></div><button disabled={!assignment.title || !assignment.dueDate || saving} type="button" onClick={() => void createAssignment()} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-white disabled:opacity-40">Create Assignment</button></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Current Assignments</h3><div className="mt-4 space-y-2">{workspace?.assignments.filter((item) => String(item.classId) === classId).length ? workspace.assignments.filter((item) => String(item.classId) === classId).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><b>{item.title}</b><p className="mt-1 text-sm text-slate-500">Due {item.dueDate} · {item.status}</p></div>) : <p className="text-sm text-slate-500">No assignments for this class.</p>}</div></section></div> : null}
      {tool === "announcements" || tool === "materials" ? <section className="rounded-2xl border border-dashed bg-white p-10 text-center"><p className="font-semibold text-slate-700">{tool === "announcements" ? "Announcements" : "Learning Materials"}</p><p className="mt-2 text-sm text-slate-500">This project does not currently have a connected {tool === "announcements" ? "announcement" : "learning-material"} backend service. No fabricated action is displayed.</p></section> : null}
    </div>
  );
}
