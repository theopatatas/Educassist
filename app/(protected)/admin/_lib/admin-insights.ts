import { api } from "@/src/lib/http/client";

export type AdminOverview = {
  users: number;
  teachers: number;
  students: number;
  parents: number;
  enrolledStudents: number;
};

export type AdminStudent = {
  id: number;
  yearLevel?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;
  createdAt?: string | null;
};

export type AdminTeacher = {
  id: number;
  firstName: string;
  lastName: string;
  sectionId?: number | null;
  sectionName?: string | null;
};

export type AdminActivity = {
  id: number;
  user: string;
  role: string;
  action: string;
  occurredAt: string;
  category: string;
};

export type AdminCalendarEvent = {
  id: number;
  title: string;
  date: string;
  endDate?: string | null;
  type: string;
  description?: string | null;
  createdAt?: string | null;
  createdBy?: number | null;
  creator?: { id: number; name: string } | null;
  startTime?: string | null;
  endTime?: string | null;
  targetAudience?: string | null;
  location?: string | null;
  status?: string | null;
};

export type AdminPendingTask = {
  id: string;
  label: string;
  count: number;
  status: "critical" | "warning" | "info";
  href: string;
};

export type AnalyticsFilters = {
  schoolYear: string;
  semester: string;
  quarter: string;
  gradeLevel: string;
  section: string;
  dateFrom: string;
  dateTo: string;
};

export type AdminAnalytics = {
  updatedAt?: string | null;
  kpis?: { enrollmentGrowth?: number | null } | null;
  enrollmentTrend: Array<{ label: string; value: number }>;
  enrollmentStatus: {
    newStudents: number;
    transferred: number;
    graduated: number;
    inactive: number;
  } | null;
  performance: {
    overallAverage: number;
    passingRate: number;
    honorStudents: number;
    atRisk: number;
    highestGradeLevel: string;
    lowestGradeLevel: string;
  } | null;
  attendance: {
    present: number;
    late: number;
    absent: number;
    rate: number;
    daily: Array<{ label: string; value: number }>;
    weekly: Array<{ label: string; value: number }>;
    monthly: Array<{ label: string; value: number }>;
  } | null;
  subjects?: Array<{
    id: number;
    name: string;
    averageGrade: number | null;
    studentCount: number | null;
    teacherCount: number | null;
  }>;
  subjectSummary?: {
    highestPerforming: string | null;
    lowestPerforming: string | null;
  } | null;
  sections?: Array<{
    id: number;
    name: string;
    adviser: string | null;
    studentCount: number;
    averageGrade: number | null;
    attendanceRate: number | null;
  }>;
  gradeComparison?: Array<{
    gradeLevel: string;
    studentCount: number;
    averageGrade: number | null;
    attendanceRate: number | null;
    passingRate: number | null;
  }>;
  insights?: Array<{ id: string; label: string; value: string | number }>;
  dataQuality?: Array<{ id: string; label: string; count: number }>;
  exports?: { pdf: boolean; excel: boolean; csv: boolean } | null;
};

const normalizeOverview = (
  value: Partial<AdminOverview> | undefined,
): AdminOverview => ({
  users: Number(value?.users ?? 0),
  teachers: Number(value?.teachers ?? 0),
  students: Number(value?.students ?? 0),
  parents: Number(value?.parents ?? 0),
  enrolledStudents: Number(value?.enrolledStudents ?? 0),
});

export async function getDashboardCore() {
  const [overviewResponse, studentsResponse, teachersResponse] =
    await Promise.all([
      api.get("/api/admin/overview"),
      api.get("/api/students"),
      api.get("/api/teachers"),
    ]);
  return {
    overview: normalizeOverview(overviewResponse.data?.overview),
    students: Array.isArray(studentsResponse.data?.students)
      ? (studentsResponse.data.students as AdminStudent[])
      : [],
    teachers: Array.isArray(teachersResponse.data?.teachers)
      ? (teachersResponse.data.teachers as AdminTeacher[])
      : [],
  };
}

// These typed clients are ready for the corresponding backend services. Until
// those services exist, callers present an explicit unavailable/empty state.
export async function getAdminActivities() {
  const { data } = await api.get("/api/admin/activities");
  return Array.isArray(data?.activities)
    ? (data.activities as AdminActivity[])
    : [];
}
export async function getAdminCalendarEvents() {
  const { data } = await api.get("/api/events");
  return Array.isArray(data?.events) ? data.events.map(fromSharedEvent) : [];
}
export async function createAdminCalendarEvent(
  event: Omit<AdminCalendarEvent, "id">,
) {
  const { data } = await api.post("/api/events", toSharedEvent(event));
  return fromSharedEvent(data?.event);
}
export async function updateAdminCalendarEvent(
  id: number,
  event: Omit<AdminCalendarEvent, "id">,
) {
  const { data } = await api.patch(`/api/events/${id}`, toSharedEvent(event));
  return fromSharedEvent(data?.event);
}
export async function deleteAdminCalendarEvent(id: number) {
  await api.delete(`/api/events/${id}`);
}

type SharedEvent = {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  targetAudience?: string | null;
  location?: string | null;
  status?: string | null;
  createdAt?: string | null;
  createdBy?: number | null;
  creator?: { id: number; name: string } | null;
};
function sharedCategory(type: string) {
  return type === "Meetings"
    ? "Meeting"
    : type === "Holidays"
      ? "Holiday"
      : type === "School Activities"
        ? "School Activity"
        : type;
}
function adminCategory(category: string) {
  return category === "Meeting"
    ? "Meetings"
    : category === "Holiday"
      ? "Holidays"
      : category === "School Activity"
        ? "School Activities"
        : category;
}
function fromSharedEvent(event: SharedEvent): AdminCalendarEvent {
  return {
    id: Number(event.id),
    title: event.title,
    date: event.eventDate,
    endDate: event.endDate ?? null,
    type: adminCategory(event.category),
    description: event.description ?? null,
    startTime: event.startTime ?? null,
    endTime: event.endTime ?? null,
    targetAudience: event.targetAudience ?? null,
    location: event.location ?? null,
    status: event.status ?? null,
    createdAt: event.createdAt ?? null,
    createdBy: event.createdBy ?? null,
    creator: event.creator ?? null,
  };
}
function toSharedEvent(event: Omit<AdminCalendarEvent, "id">) {
  return {
    title: event.title,
    category: sharedCategory(event.type),
    description: event.description ?? null,
    eventDate: event.date,
    endDate: event.endDate ?? null,
    startTime: event.startTime ?? null,
    endTime: event.endTime ?? null,
    location: event.location ?? null,
    targetAudience: event.targetAudience || "All Users",
  };
}
export async function verifyAdminPassword(password: string) {
  await api.post("/api/auth/verify-password", { password });
}
export async function getAdminPendingTasks() {
  const { data } = await api.get("/api/admin/pending-tasks");
  return Array.isArray(data?.tasks) ? (data.tasks as AdminPendingTask[]) : [];
}
export async function getAdminAnalytics(filters: AnalyticsFilters) {
  const { data } = await api.get("/api/admin/analytics", { params: filters });
  return data?.analytics as AdminAnalytics;
}
export async function exportAdminAnalytics(
  format: "pdf" | "excel" | "csv",
  filters: AnalyticsFilters,
) {
  const response = await api.get(`/api/admin/analytics/export/${format}`, {
    params: filters,
    responseType: "blob",
  });
  return response.data as Blob;
}
export async function getTeacherSubjects(teacherId: number) {
  const { data } = await api.get(`/api/teachers/${teacherId}/subjects`);
  return Array.isArray(data?.subjects)
    ? (data.subjects as Array<{ id: number; name: string }>)
    : [];
}
