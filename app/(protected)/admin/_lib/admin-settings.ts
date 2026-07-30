import { api } from "@/src/lib/http/client";

export type GeneralSettings = {
  schoolName: string;
  schoolAddress: string;
  schoolContactNumber: string;
  schoolEmail: string;
  schoolLogoUrl: string | null;
  schoolMotto: string;
  timeZone: string;
  currentAcademicYear: string;
};

export type AcademicSettings = {
  currentSchoolYear: string;
  currentSemester: string;
  currentTerm: string;
  endOfSchoolYear: boolean;
  passingGrade: string;
  promotionPolicy: string;
  gradeEncodingStartDate: string;
  gradeEncodingDeadline: string;
  gradeEncodingStatus: "OPEN" | "LOCKED" | "";
  gradePublishingStatus: "OPEN" | "LOCKED" | "";
};

export type AcademicContext = {
  currentSchoolYear: string;
  currentSemester: string;
  currentTerm: string;
  gradeEncodingTerm: string;
  endOfSchoolYear: boolean;
  passingGrade: number | null;
  promotionPolicy: string;
  gradeEncodingStartDate: string;
  gradeEncodingDeadline: string;
  gradeEncodingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
  gradePublishingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
  lastUpdated: string | null;
};

export type GradeSubmissionProgress = {
  academic: AcademicContext;
  totals: {
    assignedClasses: number;
    draftClasses: number;
    publishedClasses: number;
    missingClasses: number;
  } | null;
  teachers: Array<{
    teacherId: number;
    teacherName: string;
    assignedClasses: number;
    draftClasses: number;
    publishedClasses: number;
    missingClasses: number;
  }>;
  publishedItems: Array<{
    gradeItemId: number;
    teacherName: string;
    className: string;
    gradeLevel: string | null;
    subject: string;
  }>;
};

export type AcademicAudit = {
  id: number;
  action: string;
  role: string;
  createdAt: string;
};

export type UserManagementSettings = {
  requirePasswordChange: boolean | null;
  allowPasswordReset: boolean | null;
  defaultPasswordPolicy: string;
};

export type SecuritySettings = {
  minimumPasswordLength: string;
  passwordComplexity: boolean | null;
  sessionTimeout: string;
  maximumLoginAttempts: string;
  accountLockDuration: string;
};

export type NotificationSettings = {
  emailNotifications: boolean | null;
  inAppNotifications: boolean | null;
  accountCreationNotifications: boolean | null;
  passwordResetNotifications: boolean | null;
  systemAnnouncements: boolean | null;
};

export type AppearanceSettings = {
  theme: "light" | "dark" | "system" | null;
  compactLayout: boolean | null;
};

export type SystemInformation = {
  lmsVersion: string | null;
  buildVersion: string | null;
  apiVersion: string | null;
  environment: string | null;
  lastUpdated: string | null;
};

export type AdminSettings = {
  general: GeneralSettings | null;
  academic: AcademicSettings | null;
  userManagement: UserManagementSettings | null;
  security: SecuritySettings | null;
  notifications: NotificationSettings | null;
  appearance: AppearanceSettings | null;
  branding: { logoUrl: string | null };
  systemInformation: SystemInformation;
};

// Typed integration points for the future platform-settings service. The UI
// does not call these until the backend routes are implemented.
export async function getAdminSettings() {
  const { data } = await api.get("/api/admin/settings");
  return data?.settings as AdminSettings;
}

export async function updateAdminSettingsSection<K extends keyof AdminSettings>(
  section: K,
  value: AdminSettings[K],
) {
  const { data } = await api.patch(`/api/admin/settings/${section}`, value);
  return data?.settings as AdminSettings[K];
}

export async function uploadSchoolLogo(file: File) {
  const payload = new FormData();
  payload.append("logo", file);
  const { data } = await api.post(
    "/api/admin/settings/branding/logo",
    payload,
    {
      timeout: 30000,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data?.logoUrl as string;
}

export async function removeSchoolLogo() {
  await api.delete("/api/admin/settings/branding/logo");
}

export async function getAcademicContext() {
  const { data } = await api.get("/api/admin/settings/academic-context");
  return data?.academic as AcademicContext;
}

export async function getGradeSubmissionProgress() {
  const { data } = await api.get("/api/admin/settings/academic/progress");
  return data?.progress as GradeSubmissionProgress;
}

export async function unlockPublishedGradeItem(gradeItemId: number) {
  await api.patch(
    `/api/admin/settings/academic/grade-items/${gradeItemId}/unlock`,
  );
}

export async function getAcademicAuditLogs() {
  const { data } = await api.get("/api/admin/settings/academic/audits");
  return (Array.isArray(data?.audits) ? data.audits : []) as AcademicAudit[];
}
