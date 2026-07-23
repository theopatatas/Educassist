"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  PartyPopper,
  Plus,
  School,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../../admin/_components/AdminInsightsUI";

type EventRow = {
  id: number;
  title: string;
  category: string;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  location?: string | null;
  creator?: { id: number; name: string } | null;
};
type Overview = {
  students: number;
  activeStudents: number;
  attendance: {
    present: number;
    late: number;
    absent: number;
    rate: number | null;
  };
  upcomingMeetings: number;
  holidaysThisMonth: number;
  schoolActivities: number;
  studentsByGrade: { label: string; count: number }[];
  studentsBySection: { label: string; count: number }[];
  upcomingEvents: EventRow[];
  calendarEvents: EventRow[];
};
const eventLegend = [
  { label: "Meeting", color: "bg-green-500", text: "text-green-700" },
  { label: "Holiday", color: "bg-orange-500", text: "text-orange-700" },
  { label: "School Activity", color: "bg-yellow-400", text: "text-yellow-700" },
] as const;

export default function StaffAdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [viewingEvent, setViewingEvent] = useState<EventRow | null>(null);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/api/events/dashboard")
      .then(({ data: response }) => setData(response.overview))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    api
      .get("/api/events/dashboard")
      .then(({ data: response }) => setData(response.overview))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const days = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    return Array.from(
      { length: Math.ceil((first + days) / 7) * 7 },
      (_, index) => {
        const day = index - first + 1;
        if (day < 1 || day > days) return null;
        const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          day,
          date,
          events: (data?.calendarEvents ?? []).filter(
            (event) =>
              event.eventDate <= date &&
              (event.endDate || event.eventDate) >= date,
          ),
        };
      },
    );
  }, [data?.calendarEvents, month]);
  const monthEvents = useMemo(
    () =>
      (data?.calendarEvents ?? []).filter((event) => {
        const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
        const end = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
        return (
          event.eventDate <= end && (event.endDate || event.eventDate) >= start
        );
      }),
    [data?.calendarEvents, month],
  );
  const selectedDayEvents = viewingDate
    ? (data?.calendarEvents ?? []).filter(
        (event) =>
          event.eventDate <= viewingDate &&
          (event.endDate || event.eventDate) >= viewingDate,
      )
    : [];
  const eventStyle = (category: string) =>
    eventLegend.find((item) => item.label === category) ?? {
      color: "bg-slate-400",
      text: "text-slate-700",
    };
  const cards = [
    [
      "Total Students",
      data?.students,
      "All current student records",
      GraduationCap,
      "/staff-admin/students",
      "blue",
    ],
    [
      "Active Students",
      data?.activeStudents,
      "Students currently active",
      UserCheck,
      "/staff-admin/students",
      "emerald",
    ],
    [
      "Today's Attendance",
      data?.attendance.rate == null ? null : `${data.attendance.rate}%`,
      "Present attendance rate",
      Users,
      "/staff-admin/reports",
      "cyan",
    ],
    [
      "Upcoming Meetings",
      data?.upcomingMeetings,
      "Scheduled upcoming meetings",
      CalendarDays,
      "/staff-admin/events",
      "violet",
    ],
    [
      "Holidays This Month",
      data?.holidaysThisMonth,
      "Holidays on the calendar",
      PartyPopper,
      "/staff-admin/events",
      "amber",
    ],
    [
      "School Activities",
      data?.schoolActivities,
      "Activities scheduled this month",
      School,
      "/staff-admin/events",
      "rose",
    ],
  ] as const;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-slate-500">
          Welcome back, Admin
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Daily school operations
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Students, attendance, meetings, holidays, and school activities in one
          view.
        </p>
      </section>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Dashboard data could not be loaded.{" "}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, description, icon, href, tone]) => (
          <AdminMetricCard
            key={label}
            label={label}
            value={value ?? null}
            description={description}
            icon={icon}
            href={href}
            tone={tone}
            loading={loading}
          />
        ))}
      </div>
      <div>
        <AdminPanel
          title="Academic Calendar"
          description="Plan meetings, holidays, and school activities at a glance."
          action={
            <Link
              href="/staff-admin/events?create=Meeting"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Event
            </Link>
          }
        >
          <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Event Legend
            </p>
            <div className="flex flex-wrap gap-2">
              {eventLegend.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <i className={`h-2 w-2 rounded-full ${item.color}`} />
                  {item.label === "School Activity"
                    ? "School Activities"
                    : `${item.label}s`}
                </span>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Events this month
              </p>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 shadow-sm">
                {monthEvents.length}
              </span>
            </div>
            {loading ? (
              <InsightState loading />
            ) : monthEvents.length ? (
              <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {monthEvents.map((event) => (
                  <button
                    type="button"
                    onClick={() => setViewingEvent(event)}
                    key={event.id}
                    className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <i
                      className={`h-10 w-1 shrink-0 rounded-full ${eventStyle(event.category).color}`}
                    />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-slate-800">
                        {event.title}
                      </b>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {event.eventDate}
                        {event.endDate ? ` – ${event.endDate}` : ""} ·{" "}
                        {event.category}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        Created by {event.creator?.name || "Administrator"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No events scheduled
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Add events from Meetings & Events.
                </p>
              </div>
            )}
          </div>
          <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <b className="text-sm font-semibold tracking-tight text-slate-800">
              {monthLabel}
            </b>
            <button
              type="button"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="border-r border-slate-100 bg-slate-50/80 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 last:border-r-0"
                >
                  {day}
                </div>
              ))}
              {cells.map((cell, index) => {
                const isToday =
                  cell?.date === new Date().toISOString().slice(0, 10);
                return (
                  <button
                    type="button"
                    disabled={!cell}
                    onClick={() => {
                      if (!cell) return;
                      if (cell.events.length === 1)
                        setViewingEvent(cell.events[0]);
                      else if (cell.events.length > 1)
                        setViewingDate(cell.date);
                    }}
                    key={index}
                    className="group min-h-28 border-r border-t border-slate-100 p-2 text-left hover:bg-slate-50 disabled:bg-slate-50/40"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs group-hover:scale-105 ${isToday ? "bg-slate-900 font-semibold text-white shadow-sm" : "text-slate-700"}`}
                    >
                      {cell?.day}
                    </span>
                    {cell?.events.length ? (
                      <span className="mt-2 flex flex-col gap-1.5">
                        {cell.events.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
                          >
                            <i
                              className={`h-2 w-2 shrink-0 rounded-full ${eventStyle(event.category).color}`}
                            />
                            <span className="truncate text-xs font-semibold text-slate-700">
                              {event.title}
                            </span>
                          </span>
                        ))}
                        {cell.events.length > 2 ? (
                          <span className="px-1 text-xs font-semibold text-slate-500">
                            +{cell.events.length - 2} more
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </AdminPanel>
      </div>
      <AdminPanel title="Quick Actions" description="Common daily tasks.">
        <div className="flex flex-wrap gap-2">
          {[
            ["Create Student", "/staff-admin/students?create=1"],
            ["View Students", "/staff-admin/students"],
            ["Schedule Meeting", "/staff-admin/events?create=Meeting"],
            ["Add Holiday", "/staff-admin/events?create=Holiday"],
            [
              "Add School Activity",
              "/staff-admin/events?create=School%20Activity",
            ],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              {label}
            </Link>
          ))}
        </div>
      </AdminPanel>
      <AdminPanel
        title="Recent Activities"
        description="Latest Admin actions from the activity service."
      >
        <InsightState emptyLabel="No activity records are available." />
      </AdminPanel>
      {viewingEvent ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setViewingEvent(null)
          }
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <i
                  className={`mt-1 h-12 w-1.5 shrink-0 rounded-full ${eventStyle(viewingEvent.category).color}`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${eventStyle(viewingEvent.category).text}`}
                  >
                    {viewingEvent.category}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {viewingEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {viewingEvent.eventDate}
                    {viewingEvent.endDate ? ` – ${viewingEvent.endDate}` : ""}
                    {viewingEvent.startTime
                      ? ` · ${viewingEvent.startTime.slice(0, 5)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created by {viewingEvent.creator?.name || "Administrator"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close event details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewingEvent.location ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Location
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {viewingEvent.location}
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end">
              <Link
                href="/staff-admin/events"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open Meetings & Events
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      {viewingDate ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setViewingDate(null)
          }
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Events for{" "}
                  {new Date(`${viewingDate}T00:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedDayEvents.length} events scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDate(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close day events"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {selectedDayEvents.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    setViewingDate(null);
                    setViewingEvent(event);
                  }}
                  className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 hover:shadow-md"
                >
                  <i
                    className={`h-auto w-1 shrink-0 rounded-full ${eventStyle(event.category).color}`}
                  />
                  <span>
                    <b className="text-sm text-slate-900">{event.title}</b>
                    <span className="mt-1 block text-xs font-medium text-slate-500">
                      {event.category}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
