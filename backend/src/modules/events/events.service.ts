import { Op } from "sequelize";
import { SchoolEvent } from "../../db/models/SchoolEvent.model";
import { User } from "../../db/models/User.model";
import { normalizeAcademicPeriodText } from "../../utils/academic-terms";

export type EventInput = {
  title: string;
  category: string;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  targetAudience: string;
  status?: string;
};
export type SerializedEvent = {
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
  status: string;
  createdBy: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  creator: { id: number; name: string } | null;
};
export type EventAudienceContext = {
  userId?: number | null;
  gradeLevels?: Array<string | null>;
  sectionIds?: Array<number | null>;
  sectionNames?: Array<string | null>;
  classIds?: Array<number | null>;
};

export function normalizeEventDate(
  value: string | Date | null | undefined,
) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = value instanceof Date ? value : new Date(value);
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

export async function listEvents(
  query: Record<string, unknown>,
  audienceRole?: string,
  audienceContext?: EventAudienceContext,
): Promise<SerializedEvent[]> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const statusRows = await SchoolEvent.findAll({
    attributes: ["id", "eventDate", "endDate", "status"],
  });
  await Promise.all(
    statusRows.map((event) => {
      const eventDate = normalizeEventDate(event.eventDate) ?? "";
      const endDate = normalizeEventDate(event.endDate);
      const expected =
        (endDate || eventDate) < today ? "Completed" : "Scheduled";
      return event.status === expected
        ? Promise.resolve(event)
        : event.update({ status: expected });
    }),
  );
  const where: Record<string, unknown> = {};
  if (query.category) where.category = String(query.category);
  if (query.status) where.status = String(query.status);
  if (query.dateFrom || query.dateTo) {
    where.eventDate = {
      ...(query.dateFrom ? { [Op.gte]: String(query.dateFrom) } : {}),
      ...(query.dateTo ? { [Op.lte]: String(query.dateTo) } : {}),
    };
  }
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where[Op.or as unknown as string] = [
      { title: { [Op.like]: search } },
      { category: { [Op.like]: search } },
    ];
  }
  const events = await SchoolEvent.findAll({
    where,
    order: [
      ["eventDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });
  const creatorIds = [...new Set(events.map((event) => event.createdBy))];
  const creators = await User.findAll({
    where: { id: creatorIds },
    attributes: [
      "id",
      "role",
      "firstName",
      "lastName",
      "displayName",
      "email",
    ],
  });
  const byId = new Map(creators.map((user) => [String(user.id), user]));
  return events.map((event) => {
    const row = event.toJSON() as Record<string, unknown>;
    const creator = byId.get(String(event.createdBy));
    return {
      ...row,
      category: event.category === "Quarters" ? "Terms" : event.category,
      title: normalizeAcademicPeriodText(event.title),
      description: event.description
        ? normalizeAcademicPeriodText(event.description)
        : null,
      eventDate: normalizeEventDate(event.eventDate) ?? "",
      endDate: normalizeEventDate(event.endDate),
      creator: creator
        ? {
            id: Number(creator.id),
            name:
              event.category === "Grade Encoding Deadline" &&
              ["admin", "super_admin"].includes(
                String(creator.role).toLowerCase(),
              )
                ? "Principal"
                : creator.displayName ||
                  [creator.firstName, creator.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  creator.email,
          }
        : null,
    } as SerializedEvent;
  }).filter((event) => {
    if (!audienceRole || ["admin", "managed_admin"].includes(audienceRole))
      return true;
    const audience = event.targetAudience.trim().toLowerCase();
    if (audience === "all users") return true;
    if (audienceRole === "teacher" && audience === "all teachers") return true;
    if (audienceRole === "student" && audience === "all students") return true;
    if (audienceRole === "parent" && audience === "all parents") return true;

    const valuesAfter = (prefix: string) =>
      audience.startsWith(`${prefix}:`)
        ? audience
            .slice(prefix.length + 1)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    const gradeLevels = (audienceContext?.gradeLevels ?? [])
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const sectionIds = (audienceContext?.sectionIds ?? [])
      .filter(Boolean)
      .map(String);
    const sectionNames = (audienceContext?.sectionNames ?? [])
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const classIds = (audienceContext?.classIds ?? [])
      .filter(Boolean)
      .map(String);

    if (audience === "grade level") return gradeLevels.length > 0;
    if (audience.startsWith("grade level:"))
      return valuesAfter("grade level").some((value) =>
        gradeLevels.includes(value),
      );
    if (audience === "section")
      return sectionIds.length > 0 || sectionNames.length > 0;
    if (audience.startsWith("section:"))
      return valuesAfter("section").some(
        (value) =>
          sectionIds.includes(value) || sectionNames.includes(value),
      );
    if (audience === "specific class") return classIds.length > 0;
    if (audience.startsWith("specific class:"))
      return valuesAfter("specific class").some((value) =>
        classIds.includes(value),
      );
    if (
      audience.startsWith("specific users:") ||
      audience.startsWith("specific user:")
    ) {
      const prefix = audience.startsWith("specific users")
        ? "specific users"
        : "specific user";
      return valuesAfter(prefix).includes(String(audienceContext?.userId ?? ""));
    }
    return false;
  });
}

export const createEvent = (input: EventInput, createdBy: number) =>
  SchoolEvent.create({ ...input, createdBy });
export async function updateEvent(id: string, input: Partial<EventInput>) {
  const event = await SchoolEvent.findByPk(id);
  return event ? event.update(input) : null;
}
export async function deleteEvent(id: string) {
  const event = await SchoolEvent.findByPk(id);
  if (!event) return false;
  await event.destroy();
  return true;
}
