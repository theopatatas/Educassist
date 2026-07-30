import { describe, expect, it } from "vitest";
import {
  overlappingDays,
  parseClassSchedule,
  parseMeetingDays,
  weekdayLabel,
} from "../../backend/src/modules/classes/schedule-conflict";

describe("teacher schedule conflict utilities", () => {
  it("parses the current room-first stored schedule format", () => {
    expect(
      parseClassSchedule("Mon,Wed", "Room 201|7:30 AM - 9:30 AM"),
    ).toEqual({
      days: ["Mon", "Wed"],
      startMinutes: 450,
      endMinutes: 570,
      timeLabel: "7:30 AM - 9:30 AM",
    });
  });

  it("keeps backward compatibility with the former time-first format", () => {
    expect(
      parseClassSchedule("Tuesday", "8:00 AM - 9:00 AM|Room 4")?.days,
    ).toEqual(["Tue"]);
  });

  it("detects partial and contained overlaps on the same day", () => {
    const existing = parseClassSchedule("Mon", "8:00 AM - 9:00 AM");
    const partial = parseClassSchedule("Mon", "8:30 AM - 9:30 AM");
    const contained = parseClassSchedule("Mon", "8:15 AM - 8:45 AM");
    expect(existing && partial && overlappingDays(partial, existing)).toEqual([
      "Mon",
    ]);
    expect(
      existing && contained && overlappingDays(contained, existing),
    ).toEqual(["Mon"]);
  });

  it("allows adjacent times and matching times on different days", () => {
    const existing = parseClassSchedule("Mon", "8:00 AM - 9:00 AM");
    const adjacent = parseClassSchedule("Mon", "9:00 AM - 10:00 AM");
    const differentDay = parseClassSchedule("Tue", "8:00 AM - 9:00 AM");
    expect(existing && adjacent && overlappingDays(adjacent, existing)).toEqual(
      [],
    );
    expect(
      existing && differentDay && overlappingDays(differentDay, existing),
    ).toEqual([]);
  });

  it("normalizes supported weekday labels and rejects invalid ranges", () => {
    expect(parseMeetingDays("Monday, Wed,Monday")).toEqual(["Mon", "Wed"]);
    expect(weekdayLabel("Wed")).toBe("Wednesday");
    expect(parseClassSchedule("Mon", "9:00 AM - 8:00 AM")).toBeNull();
  });
});
