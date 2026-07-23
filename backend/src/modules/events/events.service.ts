import { Op } from "sequelize";
import { SchoolEvent } from "../../db/models/SchoolEvent.model";
import { User } from "../../db/models/User.model";

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

export async function listEvents(
  query: Record<string, unknown>,
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
      const expected =
        (event.endDate || event.eventDate) < today ? "Completed" : "Scheduled";
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
    attributes: ["id", "firstName", "lastName", "displayName", "email"],
  });
  const byId = new Map(creators.map((user) => [String(user.id), user]));
  return events.map((event) => {
    const row = event.toJSON() as Record<string, unknown>;
    const creator = byId.get(String(event.createdBy));
    return {
      ...row,
      creator: creator
        ? {
            id: Number(creator.id),
            name:
              creator.displayName ||
              [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
              creator.email,
          }
        : null,
    } as SerializedEvent;
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
