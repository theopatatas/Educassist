import { api } from "@/src/lib/http/client";

export type DashboardCalendarEvent = {
  id: number;
  title: string;
  category: string;
  eventDate: string;
  endDate?: string | null;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  targetAudience?: string | null;
  location?: string | null;
  status?: string | null;
  createdAt?: string | null;
  createdBy?: number | null;
  creator?: { id: number; name: string } | null;
};
export type SchoolEventInput = {
  title: string;
  category: string;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  targetAudience: string;
  location?: string | null;
  status?: string;
};

let dashboardRequest: Promise<Record<string, unknown>> | null = null;

export function loadAdminEventDashboard() {
  if (dashboardRequest) return dashboardRequest;
  dashboardRequest = api
    .get("/api/events/dashboard")
    .then(({ data }) => {
      const overview = (data?.overview ?? {}) as Record<string, unknown>;
      const normalizeRows = (value: unknown) =>
        Array.isArray(value)
          ? (value as DashboardCalendarEvent[]).map(
              normalizeDashboardCalendarEvent,
            )
          : [];
      return {
        ...overview,
        calendarEvents: normalizeRows(overview.calendarEvents),
        upcomingEvents: normalizeRows(overview.upcomingEvents),
      };
    })
    .finally(() => {
      dashboardRequest = null;
    });
  return dashboardRequest;
}

export function normalizeCalendarDate(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function normalizeDashboardCalendarEvent(
  event: DashboardCalendarEvent,
): DashboardCalendarEvent {
  const eventDate = normalizeCalendarDate(event.eventDate);
  if (!Number(event.id) || !event.title || !eventDate)
    throw new Error("The Events API returned an incomplete event.");
  return {
    ...event,
    id: Number(event.id),
    eventDate,
    endDate: normalizeCalendarDate(event.endDate),
  };
}

export async function loadDashboardCalendarEvents() {
  const overview = await loadAdminEventDashboard();
  const rows = Array.isArray(overview.calendarEvents)
    ? (overview.calendarEvents as DashboardCalendarEvent[])
    : [];
  return rows;
}

export async function loadSchoolEvents(params?: Record<string, unknown>) {
  const { data } = await api.get("/api/events", { params });
  const rows = Array.isArray(data?.events)
    ? (data.events as DashboardCalendarEvent[])
    : [];
  return rows.map(normalizeDashboardCalendarEvent);
}

export async function createSchoolEvent(input: SchoolEventInput) {
  const { data } = await api.post("/api/events", input);
  return normalizeDashboardCalendarEvent(data?.event);
}

export async function updateSchoolEvent(
  id: number,
  input: SchoolEventInput,
) {
  const { data } = await api.patch(`/api/events/${id}`, input);
  return normalizeDashboardCalendarEvent(data?.event);
}

export async function deleteSchoolEvent(id: number) {
  await api.delete(`/api/events/${id}`);
}

export function calendarDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function calendarMonthRange(month: Date) {
  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;
  const days = new Date(year, monthNumber, 0).getDate();
  return {
    start: calendarDate(year, monthNumber, 1),
    end: calendarDate(year, monthNumber, days),
  };
}

export function calendarEventOccursOn(
  event: Pick<DashboardCalendarEvent, "eventDate" | "endDate">,
  date: string,
) {
  return calendarDateRangeOccursOn(event.eventDate, event.endDate, date);
}

export function calendarDateRangeOccursOn(
  startDate: string,
  endDate: string | null | undefined,
  date: string,
) {
  return startDate <= date && (endDate || startDate) >= date;
}

export function calendarDateRangeOccursInMonth(
  startDate: string,
  endDate: string | null | undefined,
  month: Date,
) {
  const range = calendarMonthRange(month);
  return startDate <= range.end && (endDate || startDate) >= range.start;
}

export function calendarEventsForMonth<T extends DashboardCalendarEvent>(
  events: T[],
  month: Date,
) {
  const range = calendarMonthRange(month);
  return events.filter(
    (event) =>
      event.eventDate <= range.end &&
      (event.endDate || event.eventDate) >= range.start,
  );
}
