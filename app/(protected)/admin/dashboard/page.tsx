"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers3,
  Megaphone,
  Moon,
  Pencil,
  Plus,
  School,
  ShieldCheck,
  Sun,
  Sunset,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../_components/AdminInsightsUI";
import {
  createAdminCalendarEvent,
  deleteAdminCalendarEvent,
  getAdminActivities,
  getAdminCalendarEvents,
  getAdminPendingTasks,
  getDashboardCore,
  getTeacherSubjects,
  updateAdminCalendarEvent,
  verifyAdminPassword,
  type AdminActivity,
  type AdminCalendarEvent,
  type AdminOverview,
  type AdminPendingTask,
  type AdminStudent,
} from "../_lib/admin-insights";
import { getLocal, setLocal } from "@/src/lib/storage/local";

const emptyOverview: AdminOverview = {
  users: 0,
  teachers: 0,
  students: 0,
  parents: 0,
  enrolledStudents: 0,
};
const quickActions = [
  {
    label: "Create Teacher",
    href: "/admin/teachers",
    icon: UserPlus,
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    label: "Create Student",
    href: "/admin/students",
    icon: GraduationCap,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    label: "Create Subject",
    href: "/admin/subjects",
    icon: BookOpenText,
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    label: "Create Section",
    href: "/admin/subjects",
    icon: Layers3,
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    label: "View Reports",
    href: "/admin/reports",
    icon: BarChart3,
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    label: "Send Announcement",
    href: "/admin/forms",
    icon: Megaphone,
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
];
const reportShortcuts = [
  "Student Reports",
  "Teacher Reports",
  "Attendance Reports",
  "Enrollment Reports",
  "Academic Performance Reports",
];
const calendarStorageKey = "educassist_admin_calendar_events";
const eventLegend = [
  { label: "Deadlines", color: "bg-red-500" },
  { label: "Grade Encoding Deadline", color: "bg-blue-500" },
  { label: "Quarters", color: "bg-purple-500" },
  { label: "Meetings", color: "bg-green-500" },
  { label: "Holidays", color: "bg-orange-500" },
  { label: "School Activities", color: "bg-yellow-400" },
  { label: "Exams", color: "bg-slate-900" },
] as const;
type EventCategory = (typeof eventLegend)[number]["label"];
function eventDateLabel(event: Pick<AdminCalendarEvent, "date" | "endDate">) {
  const start = new Date(`${event.date}T00:00:00`);
  if (!event.endDate || event.endDate === event.date)
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const end = new Date(`${event.endDate}T00:00:00`);
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  )
    return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${end.getDate()}, ${end.getFullYear()}`;
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [coreError, setCoreError] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [activitiesUnavailable, setActivitiesUnavailable] = useState(false);
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<AdminCalendarEvent | null>(
    null,
  );
  const [editingEvent, setEditingEvent] = useState<AdminCalendarEvent | null>(
    null,
  );
  const [eventStatus, setEventStatus] = useState("");
  const [passwordAction, setPasswordAction] = useState<{
    type: "edit" | "delete";
    event: AdminCalendarEvent;
  } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    endDate: "",
    type: "School Activities" as EventCategory,
    startTime: "",
    endTime: "",
    targetAudience: "All Students",
    location: "",
    description: "",
  });
  const [tasks, setTasks] = useState<AdminPendingTask[]>([]);
  const [tasksUnavailable, setTasksUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    getDashboardCore()
      .then(async (data) => {
        if (!active) return;
        setOverview(data.overview);
        setStudents(data.students);
        const subjectResults = await Promise.allSettled(
          data.teachers.map((teacher) => getTeacherSubjects(teacher.id)),
        );
        if (!active) return;
        const ids = new Set<number>();
        subjectResults.forEach(
          (result) =>
            result.status === "fulfilled" &&
            result.value.forEach((subject) => ids.add(subject.id)),
        );
        if (subjectResults.some((result) => result.status === "fulfilled"))
          setSubjectCount(ids.size);
      })
      .catch(() => active && setCoreError(true))
      .finally(() => active && setLoading(false));

    getAdminActivities()
      .then((value) => active && setActivities(value))
      .catch(() => active && setActivitiesUnavailable(true));
    getAdminCalendarEvents()
      .then((value) => active && setEvents(value))
      .catch(() => {
        if (!active) return;
        setEvents(getLocal<AdminCalendarEvent[]>(calendarStorageKey) ?? []);
        setEventsUnavailable(true);
      });
    getAdminPendingTasks()
      .then((value) => active && setTasks(value))
      .catch(() => active && setTasksUnavailable(true));
    return () => {
      active = false;
    };
  }, []);

  const sectionCount = useMemo(
    () =>
      new Set(students.map((student) => student.sectionId).filter(Boolean))
        .size,
    [students],
  );
  const parentCoverage = overview.students
    ? Math.min(100, Math.round((overview.parents / overview.students) * 100))
    : 0;

  const monthLabel = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1,
  ).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const monthStart = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const eventOccursOn = (event: AdminCalendarEvent, date: string) =>
    event.date <= date && (event.endDate || event.date) >= date;
  const monthEvents = events.filter(
    (event) =>
      event.date <= monthEnd && (event.endDate || event.date) >= monthStart,
  );
  const today = new Date();
  const currentHour = today.getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";
  const GreetingIcon =
    currentHour < 12 ? Sun : currentHour < 18 ? Sunset : Moon;
  const selectedDayEvents = viewingDate
    ? events.filter((event) => eventOccursOn(event, viewingDate))
    : [];
  const eventColor = (type: string) =>
    eventLegend.find((item) => item.label === type)?.color ??
    (type === "DepEd Forms" ? "bg-blue-500" : "bg-slate-400");
  const eventTextColor = (type: string) =>
    ({
      Deadlines: "text-red-600",
      "Grade Encoding Deadline": "text-blue-600",
      "DepEd Forms": "text-blue-600",
      Quarters: "text-purple-600",
      Meetings: "text-green-600",
      Holidays: "text-orange-600",
      "School Activities": "text-yellow-600",
      Exams: "text-slate-900",
    })[type] ?? "text-slate-900";
  const openEventModal = (event?: AdminCalendarEvent, date?: string) => {
    setEditingEvent(event ?? null);
    setEventStatus("");
    setEventForm(
      event
        ? {
            title: event.title,
            date: event.date,
            endDate: event.endDate ?? "",
            type: event.type as EventCategory,
            startTime: event.startTime?.slice(0, 5) ?? "",
            endTime: event.endTime?.slice(0, 5) ?? "",
            targetAudience: event.targetAudience ?? "All Students",
            location: event.location ?? "",
            description: event.description ?? "",
          }
        : {
            title: "",
            date: date ?? "",
            endDate: "",
            type: "School Activities",
            startTime: "",
            endTime: "",
            targetAudience: "All Students",
            location: "",
            description: "",
          },
    );
    setEventModalOpen(true);
  };
  const saveCalendarEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    setEventStatus("Saving event…");
    if (eventForm.endDate && eventForm.endDate < eventForm.date) {
      setEventStatus("End date must be on or after the start date.");
      return;
    }
    if (
      eventForm.startTime &&
      eventForm.endTime &&
      eventForm.endTime <= eventForm.startTime
    ) {
      setEventStatus("End time must be after start time.");
      return;
    }
    const payload = {
      title: eventForm.title.trim(),
      date: eventForm.date,
      endDate: eventForm.endDate || null,
      type: eventForm.type,
      startTime: eventForm.startTime || null,
      endTime: eventForm.endTime || null,
      targetAudience: eventForm.targetAudience,
      location: eventForm.location.trim() || null,
      description: eventForm.description.trim() || null,
    };
    try {
      const saved = editingEvent
        ? await updateAdminCalendarEvent(editingEvent.id, payload)
        : await createAdminCalendarEvent(payload);
      setEvents((current) =>
        editingEvent
          ? current.map((event) =>
              event.id === editingEvent.id ? saved : event,
            )
          : [...current, saved],
      );
      window.dispatchEvent(new Event("educassist-event-updated"));
    } catch {
      const saved: AdminCalendarEvent = {
        ...payload,
        id: editingEvent?.id ?? Date.now(),
      };
      setEvents((current) => {
        const next = editingEvent
          ? current.map((event) =>
              event.id === editingEvent.id ? saved : event,
            )
          : [...current, saved];
        setLocal(calendarStorageKey, next);
        return next;
      });
      setEventsUnavailable(true);
    }
    setEventModalOpen(false);
  };
  const requestPasswordConfirmation = (
    type: "edit" | "delete",
    event: AdminCalendarEvent,
  ) => {
    setAdminPassword("");
    setPasswordError("");
    setPasswordAction({ type, event });
  };
  const confirmProtectedAction = async () => {
    if (!passwordAction || !adminPassword) return;
    setVerifyingPassword(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      const action = passwordAction;
      setPasswordAction(null);
      setAdminPassword("");
      if (action.type === "edit") openEventModal(action.event);
      else {
        setEditingEvent(action.event);
        try {
          await deleteAdminCalendarEvent(action.event.id);
          window.dispatchEvent(new Event("educassist-event-updated"));
        } catch {
          setEventsUnavailable(true);
        }
        setEvents((current) => {
          const next = current.filter((event) => event.id !== action.event.id);
          setLocal(calendarStorageKey, next);
          return next;
        });
        setEventModalOpen(false);
      }
    } catch {
      setPasswordError("Incorrect admin password. Please try again.");
    } finally {
      setVerifyingPassword(false);
    }
  };

  const metrics = [
    {
      label: "Total Users",
      value: overview.users,
      description: "Registered platform accounts",
      icon: Users,
      href: "/admin/accounts",
      tone: "blue" as const,
    },
    {
      label: "Teacher Count",
      value: overview.teachers,
      description: "Registered teachers",
      icon: UserCheck,
      href: "/admin/teachers",
      tone: "amber" as const,
    },
    {
      label: "Student Count",
      value: overview.students,
      description: "Registered students",
      icon: GraduationCap,
      href: "/admin/students",
      tone: "emerald" as const,
    },
    {
      label: "Parent Coverage",
      value: `${parentCoverage}%`,
      description: `${overview.parents} linked parent accounts`,
      icon: ShieldCheck,
      href: "/admin/accounts",
      tone: "rose" as const,
    },
    {
      label: "Total Subjects",
      value: subjectCount,
      description: "Subjects assigned to teachers",
      icon: BookOpenText,
      href: "/admin/subjects",
      tone: "violet" as const,
    },
    {
      label: "Total Sections",
      value: sectionCount || null,
      description: "Sections represented by students",
      icon: Layers3,
      href: "/admin/subjects",
      tone: "cyan" as const,
    },
    {
      label: "Total Classes",
      value: null,
      description: "Awaiting an admin classes endpoint",
      icon: School,
      href: "/admin/subjects",
      tone: "blue" as const,
    },
    {
      label: "Current School Year",
      value: null,
      description: "Awaiting school-year configuration",
      icon: CalendarDays,
      href: "/admin/settings",
      tone: "violet" as const,
    },
    {
      label: "Active Teachers",
      value: overview.teachers,
      description: "Current registered teacher records",
      icon: UserCheck,
      href: "/admin/teachers",
      tone: "amber" as const,
    },
    {
      label: "Active Students",
      value: overview.enrolledStudents,
      description: "Currently enrolled students",
      icon: UsersRound,
      href: "/admin/students",
      tone: "emerald" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_a]:cursor-pointer [&_a]:transition-all [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-slate-400 [&_a]:focus-visible:ring-offset-2 [&_button:not(:disabled)]:cursor-pointer [&_button]:transition-all [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-slate-400 [&_button]:focus-visible:ring-offset-2 [&_select]:cursor-pointer">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Welcome back, Super Admin
          </p>
          <h1
            suppressHydrationWarning
            className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {greeting}!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Here is a focused overview of users, academics, and work requiring
            attention.
          </p>
          {coreError ? (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              Live dashboard data could not be loaded. Please try again later.
            </p>
          ) : null}
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600 shadow-sm">
          <GreetingIcon className="h-7 w-7" />
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.label} {...metric} loading={loading} />
        ))}
      </div>

      <div>
        <AdminPanel
          title="Academic Calendar"
          description="Plan and manage the school month at a glance."
          action={
            <button
              type="button"
              onClick={() => openEventModal()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add event
            </button>
          }
        >
          <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Event Legend
            </p>
            <div className="flex flex-wrap gap-2">
              {eventLegend.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm"
                >
                  <i className={`h-2 w-2 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                Events this month
              </p>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm">
                {monthEvents.length}
              </span>
            </div>
            {monthEvents.length ? (
              <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {monthEvents.map((event) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingEvent(event)}
                    onKeyDown={(keyEvent) =>
                      (keyEvent.key === "Enter" || keyEvent.key === " ") &&
                      setViewingEvent(event)
                    }
                    key={event.id}
                    className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <i
                      className={`h-10 w-1 shrink-0 rounded-full ${eventColor(event.type)}`}
                    />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-slate-800">
                        {event.title}
                      </b>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {eventDateLabel(event)} · {event.type}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                        Created by {event.creator?.name || "Administrator"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        requestPasswordConfirmation("edit", event);
                      }}
                      className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Edit ${event.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-600">
                  No events scheduled
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Select a date or use Add event.
                </p>
              </div>
            )}
            {eventsUnavailable ? (
              <p className="mt-2 text-[10px] text-slate-400">
                Events are saved in this browser while the calendar server is
                unavailable.
              </p>
            ) : null}
          </div>
          <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setCalendarDate(
                  (date) =>
                    new Date(date.getFullYear(), date.getMonth() - 1, 1),
                )
              }
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <b className="text-sm font-semibold tracking-tight text-slate-800">
              {monthLabel}
            </b>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setCalendarDate(
                  (date) =>
                    new Date(date.getFullYear(), date.getMonth() + 1, 1),
                )
              }
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="border-r border-slate-100 bg-slate-50/80 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 last:border-r-0"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: totalCells }, (_, index) => {
                const day = index - firstDay + 1;
                const valid = day > 0 && day <= daysInMonth;
                const date = valid
                  ? `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : "";
                const dayEvents = events.filter((event) =>
                  eventOccursOn(event, date),
                );
                const isToday =
                  valid &&
                  day === today.getDate() &&
                  calendarDate.getMonth() === today.getMonth() &&
                  calendarDate.getFullYear() === today.getFullYear();
                return (
                  <button
                    type="button"
                    disabled={!valid}
                    onClick={() => {
                      if (!valid) return;
                      if (dayEvents.length === 1) setViewingEvent(dayEvents[0]);
                      else if (dayEvents.length > 1) setViewingDate(date);
                      else openEventModal(undefined, date);
                    }}
                    key={index}
                    className="group min-h-28 border-r border-t border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 disabled:bg-slate-50/40"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs transition-transform group-hover:scale-105 ${isToday ? "bg-slate-900 font-semibold text-white shadow-sm" : "text-slate-700"}`}
                    >
                      {valid ? day : ""}
                    </span>
                    {dayEvents.length ? (
                      <span className="mt-2 flex flex-col gap-1.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            title={event.title}
                            className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
                          >
                            <i
                              className={`h-2 w-2 shrink-0 rounded-full ${eventColor(event.type)}`}
                            />
                            <span className="truncate text-[10px] font-semibold text-slate-700">
                              {event.title}
                            </span>
                          </span>
                        ))}
                        {dayEvents.length > 2 ? (
                          <span className="px-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900">
                            +{dayEvents.length - 2} more
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

      <AdminPanel
        title="Quick Actions"
        description="Open common Super Admin workflows."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map(({ label, href, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span
                className={`rounded-xl border p-2.5 transition-transform group-hover:scale-105 ${color}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel
          title="Recent Activities"
          description="Latest administrative and academic actions."
        >
          {activitiesUnavailable ? (
            <InsightState error />
          ) : activities.length ? (
            <div className="space-y-2">
              {activities.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-slate-100 p-3 text-sm"
                >
                  <b>{activity.user}</b>
                  <span className="text-slate-500"> {activity.action}</span>
                  <p className="mt-1 text-xs text-slate-400">
                    {activity.role} ·{" "}
                    {new Date(activity.occurredAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <InsightState emptyLabel="No recent activities are available." />
          )}
        </AdminPanel>
        <AdminPanel
          title="Pending Tasks"
          description="Administrative items that require follow-up."
        >
          {tasksUnavailable ? (
            <InsightState error />
          ) : tasks.length ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <i
                      className={`h-2 w-2 rounded-full ${task.status === "critical" ? "bg-rose-500" : task.status === "warning" ? "bg-amber-500" : "bg-blue-500"}`}
                    />
                    {task.label}
                  </span>
                  <b>{task.count}</b>
                </Link>
              ))}
            </div>
          ) : (
            <InsightState emptyLabel="No pending tasks were returned." />
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title="Reports Shortcuts"
        description="Open reporting workspaces for students, teachers, attendance, enrollment, and performance."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {reportShortcuts.map((label) => (
            <Link
              key={label}
              href="/admin/reports"
              className="group flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:translate-y-0"
            >
              <FileText className="h-4 w-4 transition-transform group-hover:scale-110" />
              {label}
            </Link>
          ))}
        </div>
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
                  className={`mt-1 h-12 w-1.5 shrink-0 rounded-full ${eventColor(viewingEvent.type)}`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${eventTextColor(viewingEvent.type)}`}
                  >
                    {viewingEvent.type}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {viewingEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {eventDateLabel(viewingEvent)}
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
            <dl className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Time
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {viewingEvent.startTime
                    ? `${viewingEvent.startTime.slice(0, 5)}${viewingEvent.endTime ? `–${viewingEvent.endTime.slice(0, 5)}` : ""}`
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Audience
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {viewingEvent.targetAudience || "All Users"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">
                  {viewingEvent.status || "Scheduled"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewingEvent.description || "No description provided."}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const event = viewingEvent;
                  setViewingEvent(null);
                  requestPasswordConfirmation("edit", event);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit event
              </button>
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
                  {selectedDayEvents.length}{" "}
                  {selectedDayEvents.length === 1 ? "event" : "events"}{" "}
                  scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDate(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close event details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setViewingDate(null);
                    setViewingEvent(event);
                  }}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                      setViewingDate(null);
                      setViewingEvent(event);
                    }
                  }}
                  className="group flex w-full cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 hover:shadow-md"
                >
                  <i
                    className={`h-auto w-1 shrink-0 rounded-full ${eventColor(event.type)}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <b className="text-sm text-slate-900">{event.title}</b>
                      <button
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setViewingDate(null);
                          requestPasswordConfirmation("edit", event);
                        }}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Edit ${event.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">
                      {event.type}
                    </span>
                    <span className="mt-2 block truncate text-sm text-slate-600">
                      {event.description || "No description provided."}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const date = viewingDate;
                  setViewingDate(null);
                  openEventModal(undefined, date);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add another event
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {eventModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setEventModalOpen(false)
          }
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingEvent ? "Edit Event" : "Add Event"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add an event to the academic calendar. Status updates
                  automatically after the event date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:rotate-3 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                aria-label="Close event form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Title
                <input
                  value={eventForm.title}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Category
                <select
                  value={eventForm.type}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      type: event.target.value as EventCategory,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300"
                >
                  {eventLegend.map((item) => (
                    <option key={item.label}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Start Date
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                End Date (Optional)
                <input
                  type="date"
                  min={eventForm.date || undefined}
                  value={eventForm.endDate}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Start Time (Optional)
                <input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                End Time (Optional)
                <input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Target Audience
                <select
                  value={eventForm.targetAudience}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      targetAudience: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option>All Students</option>
                  <option>All Teachers</option>
                  <option>All Parents</option>
                  <option>All Users</option>
                  <option>Grade Level</option>
                  <option>Section</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Location
                <input
                  value={eventForm.location}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Enter location"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            {eventStatus ? (
              <p className="mt-3 text-xs text-slate-500">{eventStatus}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-between">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() =>
                    requestPasswordConfirmation("delete", editingEvent)
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:-translate-y-0.5 hover:bg-rose-50 active:translate-y-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !eventForm.title.trim() ||
                    !eventForm.date ||
                    !eventForm.targetAudience
                  }
                  onClick={saveCalendarEvent}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {editingEvent ? "Save Changes" : "Add Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {passwordAction ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setPasswordAction(null)
          }
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Confirm Admin Password
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enter your password to {passwordAction.type} “
                  {passwordAction.event.title}”.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordAction(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close password confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-medium text-slate-600">
              Admin password
              <input
                type="password"
                autoFocus
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" && void confirmProtectedAction()
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {passwordError ? (
              <p role="alert" className="mt-2 text-xs text-rose-600">
                {passwordError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordAction(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!adminPassword || verifyingPassword}
                onClick={confirmProtectedAction}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifyingPassword ? "Verifying…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
