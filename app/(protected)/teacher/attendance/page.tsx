"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

type Status = "present" | "late" | "absent";

type AttendanceRecord = {
  id: number;
  classId: number;
  studentId: number;
  date: string;
  status: Status;
  note?: string;
};
type TeacherClass = { id: number; name: string | null; gradeLevel: string | null; subjectName?: string | null };
type ApiStudent = { id: number; firstName: string; lastName: string; lrn: string; classId: number };
type ApiClassStudent = { id: number; firstName: string; lastName: string; lrn: string };

function formatLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TeacherAttendancePage() {
  const [date, setDate] = useState(new Date());
  const [showInfo, setShowInfo] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    return window.localStorage.getItem("teacher_selected_section") || "All Sections";
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grade Levels";
    return window.localStorage.getItem("teacher_selected_grade") || "All Grade Levels";
  });
  const [selectedSubject, setSelectedSubject] = useState(() => {
    if (typeof window === "undefined") return "All Subjects";
    return window.localStorage.getItem("teacher_selected_subject") || "All Subjects";
  });
  const [availableStudents, setAvailableStudents] = useState<ApiStudent[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceDraft, setAttendanceDraft] = useState<Record<number, Status>>({});

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.classes) ? (data.classes as TeacherClass[]) : [];
        setTeacherClasses(rows);
      })
      .catch(() => {
        if (active) setTeacherClasses([]);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_section", selectedSection);
  }, [selectedSection]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_grade", selectedGrade);
  }, [selectedGrade]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_subject", selectedSubject);
  }, [selectedSubject]);

  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const section = cls.name?.trim();
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [teacherClasses]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim();
      if (!grade || grade === "Not set") continue;
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, grade);
    }
    return ["All Grade Levels", ...Array.from(uniq.values())];
  }, [teacherClasses]);
  const effectiveSection = sectionOptions.includes(selectedSection) ? selectedSection : "All Sections";
  const effectiveGrade = gradeOptions.includes(selectedGrade) ? selectedGrade : "All Grade Levels";
  const subjectOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim() || "";
      if (effectiveGrade !== "All Grade Levels" && grade !== effectiveGrade) continue;
      const subject = cls.subjectName?.trim();
      if (subject) uniq.add(subject);
    }
    return ["All Subjects", ...Array.from(uniq)];
  }, [effectiveGrade, teacherClasses]);
  const effectiveSubject = subjectOptions.includes(selectedSubject) ? selectedSubject : "All Subjects";
  const filteredClasses = useMemo(
    () =>
      teacherClasses.filter((cls) => {
        const section = cls.name?.trim() || "";
        const grade = cls.gradeLevel?.trim() || "";
        const subject = cls.subjectName?.trim() || "";
        const matchSection = effectiveSection === "All Sections" || section === effectiveSection;
        const matchGrade = effectiveGrade === "All Grade Levels" || grade === effectiveGrade;
        const matchSubject = effectiveSubject === "All Subjects" || subject === effectiveSubject;
        return matchSection && matchGrade && matchSubject;
      }),
    [effectiveGrade, effectiveSection, effectiveSubject, teacherClasses]
  );

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setIsStudentsLoading(true);
    }, 0);
    Promise.all(
      filteredClasses.map(async (cls) => {
        try {
          const res = await api.get(`/api/classes/${cls.id}/students`);
          const students = Array.isArray(res.data?.students) ? (res.data.students as ApiClassStudent[]) : [];
          return students.map((student) => ({ ...student, classId: cls.id }));
        } catch {
          return [];
        }
      })
    )
      .then((rows) => {
        if (!active) return;
        const unique = new Map<number, ApiStudent>();
        for (const list of rows) {
          for (const student of list) unique.set(student.id, student);
        }
        const nextStudents = Array.from(unique.values());
        setAvailableStudents(nextStudents);
        setAttendanceDraft((prev) => {
          const next: Record<number, Status> = {};
          for (const s of nextStudents) {
            if (prev[s.id]) next[s.id] = prev[s.id];
          }
          return next;
        });
      })
      .finally(() => {
        if (active) setIsStudentsLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [filteredClasses]);

  const filteredHistory = useMemo(() => {
    const allowedStudents = new Set(availableStudents.map((s) => s.id));
    return attendanceRecords.filter((r) => allowedStudents.has(r.studentId));
  }, [attendanceRecords, availableStudents]);
  const todayKey = useMemo(() => ymd(date), [date]);
  const recordStatusByStudent = useMemo(() => {
    const map = new Map<number, Status>();
    for (const r of filteredHistory) {
      if (r.date === todayKey) map.set(r.studentId, r.status);
    }
    return map;
  }, [filteredHistory, todayKey]);

  const todayRecord = useMemo(() => filteredHistory.find((r) => r.date === todayKey), [filteredHistory, todayKey]);

  const stats = useMemo(() => {
    const present = filteredHistory.filter((r) => r.status === "present").length;
    const late = filteredHistory.filter((r) => r.status === "late").length;
    const absent = filteredHistory.filter((r) => r.status === "absent").length;
    const total = filteredHistory.length || 1;
    const rate = Math.round((present / total) * 100);
    return { present, late, absent, rate };
  }, [filteredHistory]);

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setIsAttendanceLoading(true);
    }, 0);
    api
      .get("/api/classes/attendance/me", { params: { date: todayKey } })
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.records) ? (data.records as AttendanceRecord[]) : [];
        setAttendanceRecords(rows);
      })
      .catch(() => {
        if (active) setAttendanceRecords([]);
      })
      .finally(() => {
        if (active) setIsAttendanceLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [todayKey]);

  const handleSetAttendance = async (student: ApiStudent, status: Status) => {
    setAttendanceDraft((prev) => ({ ...prev, [student.id]: status }));
    try {
      await api.post("/api/classes/attendance/me", {
        date: todayKey,
        records: [{ classId: student.classId, studentId: student.id, status }],
      });
      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.studentId === student.id && r.classId === student.classId && r.date === todayKey);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], status };
          return next;
        }
        return [...prev, { id: Number(`${student.classId}${student.id}`), classId: student.classId, studentId: student.id, date: todayKey, status }];
      });
    } catch {
      // keep optimistic local state
    }
  };

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };

  const badge = (status?: Status) => {
    if (!status) return { label: "No record", cls: "bg-gray-100 text-gray-700 border-gray-200" };
    if (status === "present") return { label: "Present", cls: "bg-green-50 text-green-700 border-green-200" };
    if (status === "late") return { label: "Late", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Absent", cls: "bg-red-50 text-red-700 border-red-200" };
  };

  const statusBadge = badge(todayRecord?.status);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-500">Track attendance by section and grade level</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap">
          <div className="relative">
            <select
              value={effectiveSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select section"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={effectiveGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select grade level"
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={effectiveSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select subject"
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 px-2 text-xs font-medium text-gray-700">
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
            {formatLong(date)}
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Attendance Rate</p>
            <p className="text-3xl font-extrabold text-gray-900">{stats.rate}%</p>
            <p className="mt-1 text-sm text-gray-500">Based on {filteredHistory.length} recorded day(s)</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
            <CheckCircle2 className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-green-700">Present</p>
              <p className="text-2xl font-bold text-green-900">{stats.present}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-amber-700">Late</p>
              <p className="text-2xl font-bold text-amber-900">{stats.late}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-red-700">Absent</p>
              <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="font-bold text-gray-800">Students Available for Attendance</h3>
          <p className="mt-1 text-sm text-gray-500">Enrolled students from selected section and grade</p>
        </div>
        <div className="divide-y divide-gray-100">
          {isStudentsLoading || isAttendanceLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading students...</div>
          ) : availableStudents.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No enrolled students for selected filters.</div>
          ) : (
            availableStudents.map((student) => {
              const selected = attendanceDraft[student.id] ?? recordStatusByStudent.get(student.id);
              return (
                <div key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.lastName}, {student.firstName}
                    </p>
                    <p className="text-xs text-gray-500">LRN: {student.lrn}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["present", "late", "absent"] as Status[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void handleSetAttendance(student, status)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                          selected === status ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="font-bold text-gray-800">Selected Day</h3>
          <div className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusBadge.cls}`}>{statusBadge.label}</div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold text-gray-900">{formatLong(date)}</p>
            </div>

            <button
              onClick={() => setShowInfo(true)}
              className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              type="button"
            >
              <Info className="h-4 w-4" />
              What do these mean?
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Status</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{statusBadge.label}</p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Time In</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {todayRecord?.status ? (todayRecord.status === "late" ? "08:20 AM" : "08:00 AM") : "-"}
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Note</p>
              <p className="mt-1 text-sm text-gray-700">{todayRecord?.note?.trim() ? todayRecord.note : "No note for this day."}</p>
            </div>
          </div>
        </div>
      </div>

      {showInfo ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowInfo(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900">Attendance Status Guide</h3>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Present</p>
                  <p className="text-sm text-gray-600">You attended class on time.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Late</p>
                  <p className="text-sm text-gray-600">You arrived after the start time.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-red-50">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Absent</p>
                  <p className="text-sm text-gray-600">No attendance record for the day.</p>
                </div>
              </div>
            </div>

            <div className="border-t bg-gray-50 p-5 text-sm text-gray-600">
              If you think a record is wrong, contact your subject teacher or class adviser.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
