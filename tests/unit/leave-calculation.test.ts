import { describe, expect, it } from "vitest";
import { calculateLeaveDays } from "../../backend/src/modules/leave/leave.service";

describe("teacher leave duration", () => {
  it("counts both the start and end date", () => {
    expect(calculateLeaveDays("2026-07-20", "2026-07-24")).toBe(5);
  });

  it("counts a single-day leave as one day", () => {
    expect(calculateLeaveDays("2026-07-20", "2026-07-20")).toBe(1);
  });

  it("rejects an end date before the start date", () => {
    expect(calculateLeaveDays("2026-07-21", "2026-07-20")).toBe(0);
  });
});
