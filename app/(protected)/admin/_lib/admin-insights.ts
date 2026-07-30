import { api } from "@/src/lib/http/client";
import {
  createSchoolEvent,
  deleteSchoolEvent,
  loadDashboardCalendarEvents,
  normalizeCalendarDate,
  updateSchoolEvent,
} from "@/src/features/events/adminCalendar";

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
  id: string;
  title: string;
  description: string;
  user: string;
  role: string;
  module: string;
  occurredAt: string;
  category: string;
  href?: string | null;
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
  description: string;
  count: number;
  status: "critical" | "warning" | "info";
  href: string;
};

export type AnalyticsFilters = {
  schoolYear: string;
  term: string;
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  student: string;
  dateFrom: string;
  dateTo: string;
};

export type AdminAnalytics = {
  updatedAt?: string | null;
  kpis?: {
    totalStudents: number;
    totalTeachers: number;
    totalSubjects: number;
    totalSections: number;
    enrollmentGrowth?: number | null;
    averageAttendance: number;
    averagePerformance: number | null;
    passingRate: number | null;
  } | null;
  academic?: {
    currentSchoolYear?: string;
    currentTerm?: string;
    gradeEncodingStatus?: string;
    gradePublishingStatus?: string;
  };
  filterOptions?: {
    schoolYears: string[];
    gradeLevels: string[];
    sections: Array<{ id: number; name: string }>;
    subjects: Array<{ id: number; name: string }>;
    teachers: Array<{ id: number; name: string }>;
    students: Array<{ id: number; name: string }>;
  };
  enrollmentTrend: Array<{ label: string; value: number }>;
  enrollmentStatus: {
    newStudents: number;
    graduated: number;
    inactive: number;
  } | null;
  performance: {
    overallAverage: number;
    passingRate: number;
    honorStudents: number;
    atRisk: number;
    highestGradeLevel: string | null;
    lowestGradeLevel: string | null;
    gradeDistribution?: {
      outstanding: number;
      proficient: number;
      passing: number;
      failing: number;
    };
  } | null;
  performanceTrend?: Array<{ label: string; value: number }>;
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
  teacherWorkload?: Array<{
    id: number;
    name: string;
    subjects: number;
    sections: number;
    students: number;
    averageGrade?: number | null;
  }>;
  teacherWorkloadSummary?: {
    highest: number;
    lowest: number;
    average: number;
  } | null;
  assignments?: {
    total: number;
    submitted: number;
    expected: number;
    completionRate: number | null;
  };
  quizzes?: {
    total: number;
    attempts: number;
    completedAttempts: number;
    averageScore: number | null;
  };
  aiUsage?: {
    conversations: number;
    teacherConversations: number;
    lessonPlans: number;
    finalizedLessonPlans: number;
  };
  parents?: {
    total: number;
    linkedStudents: number;
    coverageRate: number | null;
    loggedIn: number;
  };
  leaves?: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    completed: number;
    rejected: number;
  };
  takeovers?: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  registrationTrend?: Array<{ label: string; value: number }>;
  activityTrend?: Array<{ label: string; value: number }>;
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

export async function getAdminActivities() {
  const { data } = await api.get("/api/admin/activities");
  return Array.isArray(data?.activities)
    ? (data.activities as AdminActivity[])
    : [];
}
export async function getAdminCalendarEvents() {
  const events = await loadDashboardCalendarEvents();
  return events.map((event) => fromSharedEvent(event));
}
export async function createAdminCalendarEvent(
  event: Omit<AdminCalendarEvent, "id">,
) {
  return fromSharedEvent(await createSchoolEvent(toSharedEvent(event)));
}
export async function updateAdminCalendarEvent(
  id: number,
  event: Omit<AdminCalendarEvent, "id">,
) {
  return fromSharedEvent(await updateSchoolEvent(id, toSharedEvent(event)));
}
export async function deleteAdminCalendarEvent(id: number) {
  await deleteSchoolEvent(id);
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
function fromSharedEvent(event: SharedEvent | null | undefined): AdminCalendarEvent {
  const eventDate = normalizeCalendarDate(event?.eventDate);
  if (!event || !Number(event.id) || !event.title || !eventDate)
    throw new Error("The Events API returned an incomplete event.");
  return {
    id: Number(event.id),
    title: event.title,
    date: eventDate,
    endDate: normalizeCalendarDate(event.endDate),
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
