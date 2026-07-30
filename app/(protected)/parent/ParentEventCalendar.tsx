"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import { api } from "@/src/lib/http/client";
import { AdminPanel } from "../admin/_components/AdminInsightsUI";
import { useParentStudent } from "./ParentStudentContext";

type ParentEvent = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  targetAudience: string;
  creator: { name: string } | null;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function categoryStyle(category: string) {
  switch (category) {
    case "Meeting":
      return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" };
    case "Holiday":
      return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700" };
    case "School Activity":
      return { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" };
    case "Grade Encoding Deadline":
    case "Deadlines":
      return { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" };
    case "Terms":
      return { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700" };
    case "Exams":
      return { dot: "bg-slate-700", badge: "bg-slate-100 text-slate-700" };
    default:
      return { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700" };
  }
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: string | null) {
  if (!value) return null;
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function eventIncludesDate(event: ParentEvent, day: string) {
  return event.eventDate <= day && (event.endDate || event.eventDate) >= day;
}

export default function ParentEventCalendar() {
  const { selectedStudentId, loading: studentsLoading } = useParentStudent();
  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<ParentEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<ParentEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedStudentId || studentsLoading) return;
    let active = true;
    api
      .get("/api/events", { params: { studentId: selectedStudentId } })
      .then(({ data }) => {
        if (!active) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        if (active) setError("Calendar events could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStudentId, studentsLoading]);

  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const monthStart = dateKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const monthEnd = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthEvents = events.filter(
    (event) =>
      event.eventDate <= monthEnd &&
      (event.endDate || event.eventDate) >= monthStart,
  );
  const today = dateKey(new Date());

  const openDay = (day: number, dayEvents: ParentEvent[]) => {
    setSelectedDate(
      new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" },
      ),
    );
    setSelectedEvents(dayEvents);
  };

  return (
    <AdminPanel
      title="Academic Calendar"
      description="View school events shared with parents."
    >
      <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Event Legend
        </p>
        <div className="flex flex-wrap gap-2">
          {["Meeting", "Holiday", "School Activity"].map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm"
            >
              <span className={`h-2 w-2 rounded-full ${categoryStyle(category).dot}`} />
              {category}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Events this month</p>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm">
            {monthEvents.length}
          </span>
        </div>
        {loading ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
            Loading events…
          </p>
        ) : error ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>
        ) : monthEvents.length ? (
          <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {monthEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedDate(
                    new Date(`${event.eventDate}T00:00:00`).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    ),
                  );
                  setSelectedEvents([event]);
                }}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <span className={`h-10 w-1 shrink-0 rounded-full ${categoryStyle(event.category).dot}`} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-slate-800">{event.title}</strong>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {event.eventDate}{event.endDate ? ` – ${event.endDate}` : ""} · {event.category}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                    Created by {event.creator?.name || "Administrator"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
            <p className="text-xs font-medium text-slate-600">No events scheduled</p>
            <p className="mt-1 text-[11px] text-slate-400">
              No events have been shared with parents this month.
            </p>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() =>
            setMonth((current) =>
              new Date(current.getFullYear(), current.getMonth() - 1, 1)
            )
          }
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <strong className="text-sm font-semibold tracking-tight text-slate-800">
          {monthLabel}
        </strong>
        <button
          type="button"
          onClick={() =>
            setMonth((current) =>
              new Date(current.getFullYear(), current.getMonth() + 1, 1)
            )
          }
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {weekdays.map((day) => (
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
              const isoDate = valid
                ? dateKey(new Date(month.getFullYear(), month.getMonth(), day))
                : "";
              const dayEvents = events.filter((event) => eventIncludesDate(event, isoDate));
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!valid}
                  onClick={() => openDay(day, dayEvents)}
                  className="group min-h-28 border-r border-t border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 disabled:bg-slate-50/40"
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs transition-transform group-hover:scale-105 ${isoDate === today ? "bg-slate-900 font-semibold text-white shadow-sm" : "text-slate-700"}`}>
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
                        <span className={`h-2 w-2 shrink-0 rounded-full ${categoryStyle(event.category).dot}`} />
                        <span className="truncate text-[10px] font-semibold text-slate-700">
                          {event.title}
                        </span>
                      </span>
                    ))}
                    {dayEvents.length > 2 ? (
                      <span className="px-1 text-[10px] font-semibold text-slate-500">
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

      {selectedEvents.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEvents([])}>
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{selectedDate}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Event Details</h3>
              </div>
              <button type="button" onClick={() => setSelectedEvents([])} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close event details">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedEvents.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 p-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyle(event.category).badge}`}>{event.category}</span>
                  <h4 className="mt-3 text-lg font-semibold text-slate-900">{event.title}</h4>
                  {event.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{event.description}</p> : null}
                  <div className="mt-3 space-y-2 text-sm text-slate-500">
                    {(event.startTime || event.endTime) ? (
                      <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{formatTime(event.startTime) || "All day"}{event.endTime ? ` – ${formatTime(event.endTime)}` : ""}</p>
                    ) : null}
                    {event.location ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</p> : null}
                    {event.creator?.name ? <p>Created by {event.creator.name}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AdminPanel>
  );
}
