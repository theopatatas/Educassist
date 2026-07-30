import { Op } from "sequelize";
import { PlatformSetting } from "../../db/models/PlatformSetting.model";
import { GradeItem } from "../../db/models/GradeItem.model";
import { Class } from "../../db/models/Class.model";
import { Teacher } from "../../db/models/Teacher.model";
import { SchoolEvent } from "../../db/models/SchoolEvent.model";
import { SystemAuditLog } from "../../db/models/SystemAuditLog.model";
import { SystemNotification } from "../../db/models/SystemNotification.model";
import { User } from "../../db/models/User.model";
import {
  ACADEMIC_TERMS,
  gradeItemTermCandidates,
  normalizeActiveAcademicTerm,
  normalizeAcademicTerm,
} from "../../utils/academic-terms";

export const editableSections = [
  "general",
  "academic",
  "userManagement",
  "security",
  "notifications",
  "appearance",
] as const;
export type EditableSection = (typeof editableSections)[number];

async function findSettings() {
  return PlatformSetting.findByPk(1);
}

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
  lastUpdated: Date | null;
};

type AcademicMutationContext = {
  userId: number;
  role: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
};

const TERMS = new Set<string>([...ACADEMIC_TERMS, "End of School Year"]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function settingsRecord(value: unknown, depth = 0): Record<string, unknown> {
  if (depth > 8 || value == null) return {};
  if (typeof value === "string") {
    try {
      return settingsRecord(JSON.parse(value), depth + 1);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const encoded = entries
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, part]) => (typeof part === "string" ? part : ""))
    .join("");
  const recovered = encoded ? settingsRecord(encoded, depth + 1) : {};
  const named = Object.fromEntries(
    entries.filter(([key]) => !/^\d+$/.test(key)),
  );
  return { ...recovered, ...named };
}

function manilaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function currentTermValue(academic: Record<string, unknown>) {
  return normalizeActiveAcademicTerm(
    academic.currentTerm ?? academic["currentQuarter"],
  );
}

function encodingTerm(academic: Record<string, unknown>) {
  return Boolean(academic.endOfSchoolYear)
    ? "Term 3"
    : currentTermValue(academic);
}

function serializeAcademic(
  row: PlatformSetting | null,
  academic = settingsRecord(row?.academic),
): AcademicContext {
  const general = settingsRecord(row?.general);
  const currentSchoolYear =
    text(academic.currentSchoolYear) || text(general.currentAcademicYear);
  const currentTerm =
    currentTermValue(academic) || (currentSchoolYear ? "Term 1" : "");
  const deadline = text(academic.gradeEncodingDeadline);
  const configuredStatus = text(academic.gradeEncodingStatus).toUpperCase();
  const available =
    Boolean(currentSchoolYear) && TERMS.has(currentTerm);
  const expired = Boolean(deadline) && deadline < manilaDate();
  const open = available && configuredStatus === "OPEN" && !expired;
  return {
    currentSchoolYear,
    currentSemester: text(academic.currentSemester),
    currentTerm,
    gradeEncodingTerm: encodingTerm(academic),
    endOfSchoolYear: Boolean(academic.endOfSchoolYear),
    passingGrade: Number.isFinite(Number(academic.passingGrade))
      ? Number(academic.passingGrade)
      : null,
    promotionPolicy: text(academic.promotionPolicy),
    gradeEncodingStartDate: text(academic.gradeEncodingStartDate),
    gradeEncodingDeadline: deadline,
    gradeEncodingStatus: available ? (open ? "OPEN" : "LOCKED") : "UNAVAILABLE",
    gradePublishingStatus: available ? (open ? "OPEN" : "LOCKED") : "UNAVAILABLE",
    lastUpdated:
      (row?.getDataValue("updatedAt") as Date | undefined) ?? null,
  };
}

export async function getAcademicContext() {
  const row = await findSettings();
  const context = serializeAcademic(row);
  if (
    row &&
    context.gradeEncodingStatus === "LOCKED" &&
    text(settingsRecord(row.academic).gradeEncodingStatus) === "OPEN"
  ) {
    await row.update({
      academic: {
        ...settingsRecord(row.academic),
        gradeEncodingStatus: "LOCKED",
        gradePublishingStatus: "LOCKED",
      },
    });
  }
  return context;
}

async function syncDeadlineEvent(
  academic: Record<string, unknown>,
  userId: number,
) {
  const deadline = text(academic.gradeEncodingDeadline);
  const term = currentTermValue(academic);
  const eventId = Number(academic.gradeEncodingEventId);
  if (!deadline || !TERMS.has(term)) {
    if (eventId) await SchoolEvent.destroy({ where: { id: eventId } });
    const withoutEvent = { ...academic };
    delete withoutEvent.gradeEncodingEventId;
    return withoutEvent;
  }
  const payload = {
    title: `${term} Grade Encoding Deadline`,
    category: "Grade Encoding Deadline",
    description: `Grade encoding deadline for ${text(academic.currentSchoolYear)}. Encoding term: ${encodingTerm(academic)}.`,
    eventDate: deadline,
    endDate: null,
    startTime: null,
    endTime: null,
    location: null,
    targetAudience: "All Teachers",
    status: deadline < manilaDate() ? "Completed" : "Scheduled",
  };
  const existing = eventId ? await SchoolEvent.findByPk(eventId) : null;
  const event = existing
    ? await existing.update(payload)
    : await SchoolEvent.create({ ...payload, createdBy: userId });
  return { ...academic, gradeEncodingEventId: Number(event.id) };
}

async function notifyAcademicPeriod(
  academic: Record<string, unknown>,
  actorId: number,
) {
  const recipients = await User.findAll({
    where: {
      isActive: true,
      role: { [Op.in]: ["ADMIN", "TEACHER"] },
      id: { [Op.ne]: actorId },
    },
    attributes: ["id", "role"],
  });
  const term = currentTermValue(academic);
  const openTerm = encodingTerm(academic);
  const deadline = text(academic.gradeEncodingDeadline);
  const encodingOpen =
    text(academic.gradeEncodingStatus).toUpperCase() === "OPEN" &&
    Boolean(deadline) &&
    Boolean(openTerm);
  await Promise.all(
    recipients.map((recipient) =>
      SystemNotification.create({
        userId: Number(recipient.id),
        title: encodingOpen
          ? `${openTerm} grade encoding is now open.`
          : `${text(academic.currentSchoolYear)} is now active`,
        message: encodingOpen
          ? `Grade encoding for ${text(academic.currentSchoolYear)} is open until ${deadline}.`
          : `${term} is active. Grade encoding remains locked until the Super Admin opens it.`,
        category: "academic",
        href:
          String(recipient.role).toUpperCase() === "TEACHER"
            ? "/teacher/grade-portal"
            : "/staff-admin/dashboard",
      }),
    ),
  );
}

export async function saveAcademicSettings(
  value: Record<string, unknown>,
  context: AcademicMutationContext,
) {
  const [row] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  const previous = settingsRecord(row.academic);
  const requestedValue = value.currentTerm ?? value["currentQuarter"];
  const requestedEndOfSchoolYear =
    text(requestedValue) === "End of School Year" ||
    (normalizeActiveAcademicTerm(requestedValue) === "Term 3" &&
      Boolean(value.endOfSchoolYear));
  const requestedTerm = requestedEndOfSchoolYear
    ? "Term 3"
    : normalizeActiveAcademicTerm(requestedValue);
  const schoolYearChanged =
    text(value.currentSchoolYear) !== text(previous.currentSchoolYear);
  const termChanged =
    requestedTerm !== currentTermValue(previous) ||
    requestedEndOfSchoolYear !== Boolean(previous.endOfSchoolYear);
  let next: Record<string, unknown> = {
    ...previous,
    ...value,
    currentTerm: requestedTerm,
    endOfSchoolYear: requestedEndOfSchoolYear,
  };
  delete next["currentQuarter"];
  if (schoolYearChanged) {
    next = {
      ...next,
      currentTerm: "Term 1",
      endOfSchoolYear: false,
      gradeEncodingStartDate: "",
      gradeEncodingDeadline: "",
      gradeEncodingStatus: "LOCKED",
      gradePublishingStatus: "LOCKED",
    };
  } else if (termChanged) {
    const start = manilaDate();
    next = {
      ...next,
      gradeEncodingStartDate: start,
      gradeEncodingDeadline: addCalendarDays(start, 7),
      gradeEncodingStatus: "OPEN",
      gradePublishingStatus: "OPEN",
    };
  } else {
    const status =
      text(next.gradeEncodingStatus).toUpperCase() === "OPEN"
        ? "OPEN"
        : "LOCKED";
    next.gradeEncodingStatus = status;
    next.gradePublishingStatus = status;
  }
  next = await syncDeadlineEvent(next, context.userId);
  if (!text(previous.currentSchoolYear) && text(next.currentSchoolYear)) {
    await GradeItem.update(
      { academicYear: text(next.currentSchoolYear) },
      { where: { academicYear: null } },
    );
  }
  await row.update({
    academic: next,
    general: {
      ...settingsRecord(row.general),
      currentAcademicYear: text(next.currentSchoolYear),
    },
    updatedBy: context.userId,
  });
  await SystemAuditLog.create({
    userId: context.userId,
    role: context.role,
    action: schoolYearChanged
      ? "ACADEMIC_YEAR_CHANGED"
      : termChanged
        ? "ACADEMIC_TERM_CHANGED"
        : "ACADEMIC_SETTINGS_UPDATED",
    entityType: "platform_academic_settings",
    entityId: row.id,
    affectedTeacherId: null,
    affectedClassIds: null,
    ipAddress: context.ipAddress ?? null,
    deviceInfo: context.deviceInfo ?? null,
    metadata: { previous, current: next },
  });
  if (termChanged || schoolYearChanged)
    await notifyAcademicPeriod(next, context.userId);
  return next;
}

export async function setGradeEncodingStatus(
  status: "OPEN" | "LOCKED",
  context: AcademicMutationContext,
  deadline?: string,
) {
  const row = await findSettings();
  if (!row) return null;
  let next: Record<string, unknown> = {
    ...settingsRecord(row.academic),
    ...(deadline ? { gradeEncodingDeadline: deadline } : {}),
    gradeEncodingStatus: status,
    gradePublishingStatus: status,
  };
  next = await syncDeadlineEvent(next, context.userId);
  await row.update({ academic: next, updatedBy: context.userId });
  await SystemAuditLog.create({
    userId: context.userId,
    role: context.role,
    action:
      status === "OPEN"
        ? "GRADE_ENCODING_REOPENED"
        : "GRADE_ENCODING_LOCKED",
    entityType: "platform_academic_settings",
    entityId: row.id,
    affectedTeacherId: null,
    affectedClassIds: null,
    ipAddress: context.ipAddress ?? null,
    deviceInfo: context.deviceInfo ?? null,
    metadata: { deadline: text(next.gradeEncodingDeadline) },
  });
  return next;
}

export async function getGradeSubmissionProgress() {
  const academic = await getAcademicContext();
  const term = normalizeAcademicTerm(academic.gradeEncodingTerm);
  if (!academic.currentSchoolYear || !term) {
    return { academic, totals: null, teachers: [], publishedItems: [] };
  }
  const candidates = gradeItemTermCandidates(term);
  const [classes, items, teachers] = await Promise.all([
    Class.findAll({ order: [["id", "ASC"]] }),
    GradeItem.findAll({
      where: {
        academicYear: academic.currentSchoolYear,
        [Op.or]: candidates.map((candidate) => ({
          name: { [Op.like]: `${candidate}|%` },
        })),
      },
    }),
    Teacher.findAll(),
  ]);
  const itemByClass = new Map(
    items.map((item) => [Number(item.classId), item]),
  );
  const teacherById = new Map(
    teachers.map((teacher) => [Number(teacher.id), teacher]),
  );
  const teacherRows = new Map<
    number,
    {
      teacherId: number;
      teacherName: string;
      assignedClasses: number;
      draftClasses: number;
      publishedClasses: number;
      missingClasses: number;
    }
  >();
  for (const cls of classes) {
    const teacherId = Number(cls.teacherId);
    const teacher = teacherById.get(teacherId);
    if (!teacher) continue;
    const current = teacherRows.get(teacherId) ?? {
      teacherId,
      teacherName: [teacher.firstName, teacher.middleName, teacher.lastName]
        .filter(Boolean)
        .join(" "),
      assignedClasses: 0,
      draftClasses: 0,
      publishedClasses: 0,
      missingClasses: 0,
    };
    current.assignedClasses += 1;
    const item = itemByClass.get(Number(cls.id));
    if (!item) current.missingClasses += 1;
    else if (String(item.name).endsWith("|published"))
      current.publishedClasses += 1;
    else current.draftClasses += 1;
    teacherRows.set(teacherId, current);
  }
  const rows = Array.from(teacherRows.values());
  const classById = new Map(classes.map((cls) => [Number(cls.id), cls]));
  const publishedItems = items
    .filter((item) => String(item.name).endsWith("|published"))
    .map((item) => {
      const cls = classById.get(Number(item.classId));
      const teacher = cls
        ? teacherById.get(Number(cls.teacherId))
        : undefined;
      return {
        gradeItemId: Number(item.id),
        teacherName: teacher
          ? [teacher.firstName, teacher.middleName, teacher.lastName]
              .filter(Boolean)
              .join(" ")
          : "Teacher",
        className: cls?.name ?? "Class",
        gradeLevel: cls?.gradeLevel ?? null,
        subject: String(item.name).split("|")[1] ?? "Subject",
      };
    });
  return {
    academic,
    totals: {
      assignedClasses: rows.reduce(
        (sum, row) => sum + row.assignedClasses,
        0,
      ),
      draftClasses: rows.reduce((sum, row) => sum + row.draftClasses, 0),
      publishedClasses: rows.reduce(
        (sum, row) => sum + row.publishedClasses,
        0,
      ),
      missingClasses: rows.reduce((sum, row) => sum + row.missingClasses, 0),
    },
    teachers: rows,
    publishedItems,
  };
}

export async function unlockPublishedGradeItem(
  gradeItemId: number,
  context: AcademicMutationContext,
) {
  const item = await GradeItem.findByPk(gradeItemId);
  if (!item) return null;
  if (!String(item.name).endsWith("|published")) return false;
  const previous = item.name;
  await item.update({ name: String(item.name).replace(/\|published$/, "|draft") });
  await SystemAuditLog.create({
    userId: context.userId,
    role: context.role,
    action: "PUBLISHED_GRADES_UNLOCKED",
    entityType: "grade_item",
    entityId: Number(item.id),
    affectedTeacherId: null,
    affectedClassIds: [Number(item.classId)],
    ipAddress: context.ipAddress ?? null,
    deviceInfo: context.deviceInfo ?? null,
    metadata: { previous, current: item.name },
  });
  return item;
}

export async function listAcademicAuditLogs() {
  return SystemAuditLog.findAll({
    where: {
      entityType: {
        [Op.in]: ["platform_academic_settings", "grade_item"],
      },
    },
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
}

export async function getPlatformSettings() {
  const row = await findSettings();
  return serializeSettings(row);
}

export async function savePlatformSettingsSection(
  section: EditableSection,
  value: Record<string, unknown>,
  updatedBy?: number,
) {
  const [row] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  await row.update({ [section]: value, updatedBy: updatedBy ?? null });
  return settingsRecord(row.get(section));
}

export async function saveLogo(url: string, updatedBy?: number) {
  const [row] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  const previous = row.logoUrl;
  await row.update({ logoUrl: url, updatedBy: updatedBy ?? null });
  return { previous, logoUrl: row.logoUrl };
}

export async function clearLogo(updatedBy?: number) {
  const row = await findSettings();
  if (!row) return null;
  const previous = row.logoUrl;
  await row.update({ logoUrl: null, updatedBy: updatedBy ?? null });
  return previous;
}

function serializeSettings(row: PlatformSetting | null) {
  const storedAcademic = row ? settingsRecord(row.academic) : null;
  const academic: Record<string, unknown> | null = storedAcademic
    ? {
        ...storedAcademic,
        currentTerm: currentTermValue(storedAcademic),
      }
    : null;
  if (academic) delete academic["currentQuarter"];
  return {
    general: row ? settingsRecord(row.general) : null,
    academic,
    userManagement: row ? settingsRecord(row.userManagement) : null,
    security: row ? settingsRecord(row.security) : null,
    notifications: row ? settingsRecord(row.notifications) : null,
    appearance: row ? settingsRecord(row.appearance) : null,
    branding: { logoUrl: row?.logoUrl ?? null },
    systemInformation: {
      lmsVersion: process.env.npm_package_version || null,
      buildVersion: process.env.BUILD_VERSION || null,
      apiVersion: process.env.API_VERSION || null,
      environment: process.env.NODE_ENV || null,
      lastUpdated: row?.getDataValue("updatedAt") ?? null,
    },
  };
}
