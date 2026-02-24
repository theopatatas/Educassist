"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  date: string;
  status: Status;
  note?: string;
};

function formatLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

export default function StudentAttendancePage() {
  const [date, setDate] = useState(new Date());
  const [showInfo, setShowInfo] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/attendance/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.records) ? (data.records as AttendanceRecord[]) : [];
        setAttendanceHistory(rows);
      })
      .catch(() => {
        if (active) setAttendanceHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const todayKey = useMemo(() => ymd(date), [date]);

  const todayRecord = useMemo(
    () => attendanceHistory.find((r) => r.date === todayKey),
    [attendanceHistory, todayKey]
  );

  const stats = useMemo(() => {
    const present = attendanceHistory.filter((r) => r.status === "present").length;
    const late = attendanceHistory.filter((r) => r.status === "late").length;
    const absent = attendanceHistory.filter((r) => r.status === "absent").length;
    const total = attendanceHistory.length || 1;
    const rate = Math.round((present / total) * 100);
    return { present, late, absent, rate };
  }, [attendanceHistory]);

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
          <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>
          <p className="text-gray-500">View your daily attendance record</p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 px-2 font-medium text-gray-700">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Attendance Rate</p>
            <p className="text-3xl font-extrabold text-gray-900">{stats.rate}%</p>
            <p className="mt-1 text-sm text-gray-500">Based on {attendanceHistory.length} recorded day(s)</p>
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="font-bold text-gray-800">Attendance History</h3>
          <p className="mt-1 text-sm text-gray-500">Your recent attendance records</p>
        </div>

        <div className="divide-y divide-gray-100">
          {attendanceHistory
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((r) => {
              const b = badge(r.status);
              return (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(r.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">{r.note?.trim() ? r.note : "-"}</p>
                  </div>

                  <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${b.cls}`}>{b.label}</span>
                </div>
              );
            })}
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
