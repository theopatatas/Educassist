"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import AcademicDashboardBadges from "../../AcademicDashboardBadges";
import {
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Layers3,
  GraduationCap,
  Moon,
  Sun,
  Sunset,
  CalendarOff,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  isoDate: string;
  date: number;
  time: string;
  location: string;
  type:
    | "Quiz"
    | "Exam Schedule"
    | "Assignment"
    | "Grade Encoding Deadline"
    | "Meeting"
    | "Holiday"
    | "School Activity";
  color: string;
  sortTimestamp: number;
};

type SelectedDateEvents = {
  dateLabel: string;
  items: CalendarEvent[];
};

type ApiClass = {
  id: number;
  subjectName?: string | null;
  sectionName?: string | null;
  gradeLevel?: string | null;
};

const calendarDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ApiExam = {
  id: number;
  title: string;
  examDate: string;
  startTime?: string | null;
  duration: string;
  room?: string | null;
  subjectName?: string | null;
  sectionName?: string | null;
  gradeLevel?: string | null;
};

type ApiQuiz = {
  id: number;
  title: string;
  dueDate?: string | null;
  subjectName?: string | null;
  sectionName?: string | null;
  gradeLevel?: string | null;
};

type ApiAssignment = {
  id: number;
  title: string;
  dueDate: string;
  status: "Active" | "Closed";
  subjectName?: string | null;
  sectionName?: string | null;
  gradeLevel?: string | null;
};
type ApiSchoolEvent = {
  id: number;
  title: string;
  category: string;
  eventDate: string;
  startTime?: string | null;
  location?: string | null;
};
type DashboardLeave = {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
};

function getTimeGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatGradeSection(
  gradeLevel?: string | null,
  sectionName?: string | null,
) {
  return (
    [gradeLevel, sectionName].filter(Boolean).join(" • ") || "Class details"
  );
}

function formatDateLabel(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEndOfDayTimestamp(isoDate: string) {
  const date = new Date(`${isoDate}T23:59:59`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getStartDateTimeTimestamp(isoDate: string, time?: string | null) {
  if (time?.trim()) {
    const date = new Date(`${isoDate}T${time.trim()}:00`);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  return getEndOfDayTimestamp(isoDate);
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherClasses, setTeacherClasses] = useState<ApiClass[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<DashboardLeave[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dashboardNow] = useState(() => Date.now());
  const currentHour = new Date(dashboardNow).getHours();
  const greeting = getTimeGreeting(currentHour);
  const GreetingIcon =
    currentHour < 12 ? Sun : currentHour < 18 ? Sunset : Moon;
  const [selectedDateEvents, setSelectedDateEvents] =
    useState<SelectedDateEvents | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const firstDay = useMemo(
    () => getFirstDayOfMonth(currentDate),
    [currentDate],
  );

  const blanks = useMemo(() => Array(firstDay).fill(null), [firstDay]);
  const monthDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );
  const totalWeeks = useMemo(
    () => Math.ceil((firstDay + daysInMonth) / 7),
    [firstDay, daysInMonth],
  );
  // Header, legend, weekday labels, and every calendar week must fit inside
  // the fixed-height panel. The legend is kept outside the day-grid height.
  const panelHeight = useMemo(() => 230 + totalWeeks * 64, [totalWeeks]);

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentDate],
  );
  const examNotifCount = useMemo(
    () =>
      events.filter((e) => {
        const d = new Date(e.isoDate);
        return (
          d.getMonth() === currentDate.getMonth() &&
          d.getFullYear() === currentDate.getFullYear()
        );
      }).length,
    [events, currentDate],
  );
  const upcomingDeadlines = useMemo(() => {
    return events
      .filter((event) => event.sortTimestamp >= dashboardNow)
      .sort((a, b) => a.sortTimestamp - b.sortTimestamp)
      .slice(0, 6);
  }, [dashboardNow, events]);

  const changeMonth = (delta: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      currentDate.getMonth() === now.getMonth() &&
      currentDate.getFullYear() === now.getFullYear()
    );
  };

  const openDateEvents = (day: number, dayEvents: CalendarEvent[]) => {
    if (!dayEvents.length) return;
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    setSelectedDateEvents({
      dateLabel: date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      items: [...dayEvents].sort((a, b) => a.sortTimestamp - b.sortTimestamp),
    });
  };

  const myClassesCount = teacherClasses.length;
  const mySectionsCount = useMemo(() => {
    const uniqueSections = new Set(
      teacherClasses
        .map((row) => row.sectionName?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    return uniqueSections.size;
  }, [teacherClasses]);
  const myGradeLevelsCount = useMemo(() => {
    const uniqueGradeLevels = new Set(
      teacherClasses
        .map((row) => row.gradeLevel?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    return uniqueGradeLevels.size;
  }, [teacherClasses]);

  const stats = [
    {
      label: "My Classes",
      value: myClassesCount,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "My Sections",
      value: mySectionsCount,
      icon: Layers3,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "My Grade Levels",
      value: myGradeLevelsCount,
      icon: GraduationCap,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  useEffect(() => {
    let active = true;
    api
      .get("/api/teachers/me")
      .then(({ data }) => {
        if (!active) return;
        const first = data?.teacher?.firstName || "";
        const last = data?.teacher?.lastName || "";
        const fullName = `${first} ${last}`.trim();
        setTeacherName(fullName || "Teacher");
      })
      .catch(() => {
        if (active) setTeacherName("Teacher");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/leaves/teacher")
      .then(({ data }) => {
        if (active) {
          setTeacherLeaves(
            Array.isArray(data?.requests) ? data.requests : [],
          );
        }
      })
      .catch(() => {
        if (active) setTeacherLeaves([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/exams/me"),
      api.get("/api/quizzes/me"),
      api.get("/api/assignments/me"),
      api.get("/api/events"),
    ])
      .then(([examsRes, quizzesRes, assignmentsRes, schoolEventsRes]) => {
        if (!active) return;
        const exams = Array.isArray(examsRes.data?.exams)
          ? (examsRes.data.exams as ApiExam[])
          : [];
        const quizzes = Array.isArray(quizzesRes.data?.quizzes)
          ? (quizzesRes.data.quizzes as ApiQuiz[])
          : [];
        const assignments = Array.isArray(assignmentsRes.data?.assignments)
          ? (assignmentsRes.data.assignments as ApiAssignment[])
          : [];
        const schoolEvents = Array.isArray(schoolEventsRes.data?.events)
          ? (schoolEventsRes.data.events as ApiSchoolEvent[])
          : [];

        const examEvents: CalendarEvent[] = exams.map((exam) => {
          const d = new Date(exam.examDate);
          return {
            id: `exam-${exam.id}`,
            title: exam.title,
            isoDate: exam.examDate,
            date: d.getDate(),
            time: exam.startTime || exam.duration || "Exam",
            location:
              exam.room ||
              formatGradeSection(exam.gradeLevel, exam.sectionName),
            type: "Exam Schedule",
            color: "bg-red-100 text-red-700 border-red-200",
            sortTimestamp: getStartDateTimeTimestamp(
              exam.examDate,
              exam.startTime,
            ),
          };
        });
        const quizEvents: CalendarEvent[] = quizzes
          .filter((quiz) => Boolean(quiz.dueDate))
          .map((quiz) => {
            const isoDate = String(quiz.dueDate);
            const d = new Date(isoDate);
            return {
              id: `quiz-${quiz.id}`,
              title: quiz.title,
              isoDate,
              date: d.getDate(),
              time: "Due date",
              location: formatGradeSection(quiz.gradeLevel, quiz.sectionName),
              type: "Quiz",
              color: "bg-blue-100 text-blue-700 border-blue-200",
              sortTimestamp: getEndOfDayTimestamp(isoDate),
            };
          });
        const assignmentEvents: CalendarEvent[] = assignments
          .filter((assignment) => Boolean(assignment.dueDate))
          .map((assignment) => {
            const d = new Date(assignment.dueDate);
            return {
              id: `assignment-${assignment.id}`,
              title: assignment.title,
              isoDate: assignment.dueDate,
              date: d.getDate(),
              time: "Due date",
              location: formatGradeSection(
                assignment.gradeLevel,
                assignment.sectionName,
              ),
              type: "Assignment",
              color: "bg-amber-100 text-amber-700 border-amber-200",
              sortTimestamp: getEndOfDayTimestamp(assignment.dueDate),
            };
          });

        const schoolCalendarEvents: CalendarEvent[] = schoolEvents.map((event) => {
          const date = new Date(event.eventDate);
          const type =
            event.category === "Meeting"
              ? "Meeting"
              : event.category === "Holiday"
                ? "Holiday"
                : event.category === "School Activity"
                  ? "School Activity"
                  : "Grade Encoding Deadline";
          const color =
            type === "Meeting"
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : type === "Holiday"
                ? "bg-orange-100 text-orange-700 border-orange-200"
                : type === "School Activity"
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                  : "bg-indigo-100 text-indigo-700 border-indigo-200";
          return {
            id: `school-event-${event.id}`,
            title: event.title,
            isoDate: event.eventDate,
            date: date.getDate(),
            time: event.startTime || event.category,
            location: event.location || "Academic calendar",
            type,
            color,
            sortTimestamp: getStartDateTimeTimestamp(
              event.eventDate,
              event.startTime,
            ),
          };
        });

        setEvents([
          ...examEvents,
          ...quizEvents,
          ...assignmentEvents,
          ...schoolCalendarEvents,
        ]);
      })
      .catch(() => {
        if (active) setEvents([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.classes)
          ? (data.classes as ApiClass[])
          : [];
        setTeacherClasses(rows);
      })
      .catch(() => {
        if (active) setTeacherClasses([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              Welcome back, Teacher
            </p>
            <h1
              suppressHydrationWarning
              className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              {greeting}, {teacherName}
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Here is your learning overview for today.
            </p>

            <div className="mt-4">
              <AcademicDashboardBadges />
            </div>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600 shadow-sm">
            <GreetingIcon className="h-7 w-7" />
          </div>
        </section>

        <div className="space-y-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const isTeacherSummaryCard =
                  stat.label === "My Classes" || stat.label === "My Sections";
                return (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={
                      isTeacherSummaryCard
                        ? () => router.push("/teacher/classes")
                        : undefined
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl bg-white p-6 text-left shadow-md ${
                      isTeacherSummaryCard ? "transition hover:shadow-lg" : ""
                    }`}
                  >
                    <div className={`rounded-xl p-3 ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stat.value}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <CalendarOff className="h-5 w-5 text-violet-600" />
                  Leave Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upcoming, current, and recently reviewed requests.
                </p>
              </div>
              <button type="button" onClick={() => router.push("/teacher/leave-requests")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                View Leave Requests
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["Upcoming Leave", teacherLeaves.filter((item) => item.status === "APPROVED").length, "text-blue-600"],
                ["Current Leave", teacherLeaves.filter((item) => item.status === "ACTIVE_LEAVE").length, "text-violet-600"],
                ["Pending", teacherLeaves.filter((item) => item.status === "PENDING").length, "text-amber-600"],
                ["Rejected", teacherLeaves.filter((item) => item.status === "REJECTED").length, "text-rose-600"],
                ["Completed", teacherLeaves.filter((item) => item.status === "COMPLETED").length, "text-emerald-600"],
              ].map(([title, value, color]) => (
                <div key={String(title)} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">{String(title)}</p>
                  <p className={`mt-1 text-2xl font-bold ${String(color)}`}>{Number(value)}</p>
                </div>
              ))}
            </div>
            {teacherLeaves.length ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">Recent Leave Requests</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teacherLeaves.slice(0, 3).map((leave) => (
                    <button key={leave.id} type="button" onClick={() => router.push("/teacher/leave-requests")} className="rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50">
                      <p className="text-sm font-semibold">{leave.leaveType}</p>
                      <p className="mt-1 text-xs text-slate-500">{leave.startDate} – {leave.endDate} · {leave.status.replaceAll("_", " ")}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md"
              style={{ height: `${panelHeight}px` }}
            >
              <div className="shrink-0 border-b bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">
                      My Calendar
                    </h2>
                    <p className="text-xs text-gray-500">
                      Quizzes, exam schedule, assignment, and meetings
                    </p>
                    {examNotifCount > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Deadlines this month: {examNotifCount}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Deadlines this month: 0
                      </p>
                    )}
                  </div>

                  <div className="flex items-center rounded-xl bg-white p-1 shadow-sm">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                      aria-label="Previous month"
                      type="button"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <span className="min-w-[120px] px-3 text-center text-sm font-bold text-gray-700">
                      {monthLabel}
                    </span>

                    <button
                      onClick={() => changeMonth(1)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                      aria-label="Next month"
                      type="button"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Event Legend
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 text-xs font-medium text-slate-600">
                  {[
                    ["Quiz", "bg-blue-500"],
                    ["Exam", "bg-red-500"],
                    ["Assignment", "bg-amber-500"],
                    ["Grade Encoding", "bg-indigo-500"],
                    ["Meeting", "bg-emerald-500"],
                    ["Holiday", "bg-orange-500"],
                    ["School Activity", "bg-yellow-400"],
                  ].map(([label, color]) => (
                    <span
                      key={label}
                      className="inline-flex shrink-0 items-center gap-1.5"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 grid grid-cols-7 border-b border-gray-200">
                {calendarDays.map((day) => (
                  <div
                    key={day}
                    className="bg-gray-50 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="grid min-h-0 flex-1 grid-cols-7"
                style={{
                  gridTemplateRows: `repeat(${totalWeeks}, minmax(64px, 1fr))`,
                }}
              >
                {blanks.map((_, i) => (
                  <div
                    key={`blank-${i}`}
                    className="border-b border-r border-gray-100 bg-gray-50/30"
                  />
                ))}

                {monthDays.map((day) => {
                  const dayEvents = events.filter((e) => {
                    const d = new Date(e.isoDate);
                    return (
                      d.getDate() === day &&
                      d.getMonth() === currentDate.getMonth() &&
                      d.getFullYear() === currentDate.getFullYear()
                    );
                  });
                  return (
                    <div
                      key={day}
                      className="relative overflow-hidden border-b border-r border-gray-100 p-2 transition-colors hover:bg-gray-50"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          isToday(day)
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>

                      {dayEvents.length ? (
                        <button
                          type="button"
                          onClick={() => openDateEvents(day, dayEvents)}
                          className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                          aria-label={`View ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"} for ${day}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                          {dayEvents.length > 1 ? (
                            <span>{dayEvents.length}</span>
                          ) : null}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {events.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No calendar events yet.
                </div>
              ) : null}
            </div>
            <div
              className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-md"
              style={{ height: `${panelHeight}px` }}
            >
              <div className="shrink-0 border-b bg-gray-50 p-4">
                <h2 className="text-base font-bold text-gray-800">
                  Upcoming Deadlines
                </h2>
                <p className="text-xs text-gray-500">
                  Quizzes, exam schedules, and assignments sorted by nearest
                  date.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                {upcomingDeadlines.length ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() =>
                          setSelectedDateEvents({
                            dateLabel: formatDateLabel(event.isoDate),
                            items: [event],
                          })
                        }
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-gray-100 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                      >
                        <div className="min-w-0">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${event.color}`}
                          >
                            {event.type}
                          </span>
                          <p className="mt-2 truncate text-sm font-semibold text-gray-900">
                            {event.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {event.location}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateLabel(event.isoDate)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {event.time}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                    No upcoming deadlines yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDateEvents ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDateEvents(null)}
          />

          <div
            className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bg-gray-50 p-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedDateEvents.dateLabel}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedDateEvents.items.length} event
                  {selectedDateEvents.items.length === 1 ? "" : "s"} scheduled
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateEvents(null)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close event"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              {selectedDateEvents.items.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${event.color}`}
                      >
                        {event.type}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {event.title}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{formatDateLabel(event.isoDate)}</p>
                      <p className="mt-1">{event.time}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{event.location}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t bg-gray-50 p-5">
              <button
                type="button"
                onClick={() => setSelectedDateEvents(null)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
