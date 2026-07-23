"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../../admin/_components/AdminInsightsUI";

type Category = "Meeting" | "Holiday" | "School Activity";
type EventRow = {
  id: number;
  title: string;
  category: Category;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  targetAudience: string;
  status: string;
  createdAt: string;
  creator?: { name: string } | null;
};
const emptyForm = {
  title: "",
  category: "Meeting" as Category,
  description: "",
  eventDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "",
  targetAudience: "",
  status: "Scheduled",
};
const categories: Category[] = ["Meeting", "Holiday", "School Activity"];

function plainText(value: string, multiline = false) {
  return value
    .replace(multiline ? /[^A-Za-z0-9 \n.,?!'":;()\-]/g : /[^A-Za-z0-9 ]/g, "")
    .replace(/ {2,}/g, " ");
}

export default function StaffAdminEventsPage() {
  const params = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [viewing, setViewing] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/api/events", {
        params: {
          search: query || undefined,
          category: category || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      })
      .then(({ data }) =>
        setEvents(Array.isArray(data.events) ? data.events : []),
      )
      .catch((reason) =>
        setError(
          reason.response?.data?.message || "Events could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, [category, dateFrom, dateTo, query, status]);
  useEffect(load, [load]);
  useEffect(() => {
    const requested = params.get("create");
    if (categories.includes(requested as Category)) {
      setForm({ ...emptyForm, category: requested as Category });
      setOpen(true);
    }
  }, [params]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const summary = useMemo(
    () => ({
      meetings: events.filter((item) => item.category === "Meeting").length,
      upcoming: events.filter(
        (item) =>
          item.category === "Meeting" &&
          item.eventDate >= new Date().toISOString().slice(0, 10),
      ).length,
      holidays: events.filter((item) => item.category === "Holiday").length,
      activities: events.filter((item) => item.category === "School Activity")
        .length,
    }),
    [events],
  );
  const openCreate = (value: Category = "Meeting") => {
    setEditing(null);
    setForm({ ...emptyForm, category: value });
    setOpen(true);
  };
  const openEdit = (event: EventRow) => {
    setEditing(event);
    setForm({
      title: event.title,
      category: event.category,
      description: event.description ?? "",
      eventDate: event.eventDate,
      endDate: event.endDate ?? "",
      startTime: event.startTime?.slice(0, 5) ?? "",
      endTime: event.endTime?.slice(0, 5) ?? "",
      location: event.location ?? "",
      targetAudience: event.targetAudience,
      status: event.status,
    });
    setOpen(true);
  };
  const save = async (submit: React.FormEvent) => {
    submit.preventDefault();
    if (saving) return;
    if (form.endDate && form.endDate < form.eventDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) await api.patch(`/api/events/${editing.id}`, form);
      else await api.post("/api/events", form);
      window.dispatchEvent(new Event("educassist-event-updated"));
      setOpen(false);
      setNotice(
        editing ? "Event updated successfully." : "Event created successfully.",
      );
      await load();
    } catch (reason: unknown) {
      const response = reason as { response?: { data?: { message?: string } } };
      setError(
        response.response?.data?.message || "The event could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleting || saving) return;
    setSaving(true);
    try {
      await api.delete(`/api/events/${deleting.id}`);
      window.dispatchEvent(new Event("educassist-event-updated"));
      setDeleting(null);
      setViewing(null);
      setNotice("Event deleted successfully.");
      await load();
    } catch (reason: unknown) {
      const response = reason as { response?: { data?: { message?: string } } };
      setError(
        response.response?.data?.message || "The event could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  };
  const cards = [
    [
      "Total Meetings",
      summary.meetings,
      "All meeting records",
      CalendarDays,
      "blue",
    ],
    [
      "Upcoming Meetings",
      summary.upcoming,
      "Meetings from today onward",
      CalendarDays,
      "violet",
    ],
    ["Holidays", summary.holidays, "Holiday records", CalendarDays, "amber"],
    [
      "School Activities",
      summary.activities,
      "School activity records",
      CalendarDays,
      "emerald",
    ],
  ] as const;
  return (
    <div className="space-y-5">
      {notice ? (
        <div
          role="status"
          className="fixed right-4 top-20 z-[80] rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          {notice}
        </div>
      ) : null}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">
            School operations
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Meetings & Events
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage real meetings, holidays, and school activities.
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, description, icon, tone]) => (
          <AdminMetricCard
            key={label}
            label={label}
            value={value}
            description={description}
            icon={icon}
            href="/staff-admin/events"
            tone={tone}
            loading={loading}
          />
        ))}
      </div>
      <AdminPanel
        title="Event Directory"
        description="Search and filter meetings and events."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(plainText(event.target.value))}
              placeholder="Search title or category"
              title="Letters, numbers, and spaces only"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All statuses</option>
            <option>Scheduled</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Date from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs"
            />
            <input
              aria-label="Date to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs"
            />
          </div>
        </div>
        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}{" "}
            <button onClick={load} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <InsightState loading />
          ) : events.length ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {event.title}
                    </td>
                    <td className="px-4 py-3">{event.category}</td>
                    <td className="px-4 py-3">
                      {event.eventDate}
                      {event.endDate ? ` – ${event.endDate}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {event.startTime?.slice(0, 5) || "—"}
                      {event.endTime ? `–${event.endTime.slice(0, 5)}` : ""}
                    </td>
                    <td className="px-4 py-3">{event.location || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setViewing(event)}
                          className="rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`View ${event.title}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(event)}
                          className="rounded-lg p-2 hover:bg-amber-50 hover:text-amber-600"
                          aria-label={`Edit ${event.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(event)}
                          className="rounded-lg p-2 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${event.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <InsightState emptyLabel="No meetings or events match these filters." />
          )}
        </div>
      </AdminPanel>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? "Edit Event" : "Create Event"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Status is automatically completed after the event date.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close event form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={save} className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Title">
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: plainText(event.target.value) })
                  }
                  title="Letters, numbers, and spaces only"
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value as Category,
                    })
                  }
                  className={inputClass}
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Start Date">
                <input
                  required
                  type="date"
                  value={form.eventDate}
                  onChange={(event) =>
                    setForm({ ...form, eventDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="End Date (Optional)">
                <input
                  type="date"
                  min={form.eventDate || undefined}
                  value={form.endDate}
                  onChange={(event) =>
                    setForm({ ...form, endDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Start Time (Optional)">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm({ ...form, startTime: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="End Time (Optional)">
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm({ ...form, endTime: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Target Audience">
                <select
                  required
                  value={form.targetAudience}
                  onChange={(event) =>
                    setForm({ ...form, targetAudience: event.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Select audience</option>
                  <option>All Students</option>
                  <option>All Teachers</option>
                  <option>All Parents</option>
                  <option>Grade Level</option>
                  <option>Section</option>
                </select>
              </Field>
              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      location: plainText(event.target.value),
                    })
                  }
                  placeholder="Enter location"
                  title="Letters, numbers, and spaces only"
                  className={inputClass}
                />
              </Field>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: plainText(event.target.value, true),
                    })
                  }
                  title="Letters, numbers, spaces, common sentence punctuation, and line breaks only"
                  className={`${inputClass} resize-none`}
                />
              </label>
              <div className="flex gap-3 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {viewing ? (
        <Details
          event={viewing}
          close={() => setViewing(null)}
          edit={() => {
            setViewing(null);
            openEdit(viewing);
          }}
        />
      ) : null}
      {deleting ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Delete event?</h2>
            <p className="mt-2 text-sm text-slate-600">
              “{deleting.title}” will be permanently removed.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={remove}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
const inputClass =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500";
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-medium text-gray-700">
      {label}
      {children}
    </label>
  );
}
function Details({
  event,
  close,
  edit,
}: {
  event: EventRow;
  close: () => void;
  edit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              {event.category}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {event.title}
            </h2>
          </div>
          <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            [
              "Date",
              event.endDate
                ? `${event.eventDate} – ${event.endDate}`
                : event.eventDate,
            ],
            [
              "Time",
              event.startTime
                ? `${event.startTime.slice(0, 5)}${event.endTime ? `–${event.endTime.slice(0, 5)}` : ""}`
                : null,
            ],
            ["Location", event.location],
            ["Status", event.status],
            ["Target Audience", event.targetAudience],
            ["Created By", event.creator?.name],
            [
              "Created Date",
              event.createdAt
                ? new Date(event.createdAt).toLocaleString()
                : null,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {event.description || "No description provided."}
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={edit}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
            Edit Event
          </button>
        </div>
      </div>
    </div>
  );
}
