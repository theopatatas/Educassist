import { describe, expect, it } from "vitest";
import {
  calculateAttendancePercentage,
  calculateFinalSubjectAverage,
  calculateOverallStudentAverage,
  calculatePercentage,
  calculateQuizScore,
} from "../../backend/src/utils/calculations";

describe("score calculations", () => {
  it("calculates and rounds a percentage", () => {
    expect(calculatePercentage(8, 10)).toBe(80);
    expect(calculatePercentage(2, 3)).toBe(67);
  });

  it("returns zero for zero totals and negative input", () => {
    expect(calculatePercentage(10, 0)).toBe(0);
    expect(calculatePercentage(-5, 10)).toBe(0);
    expect(calculatePercentage(5, -10)).toBe(0);
  });

  it("caps scores above the maximum at 100", () => {
    expect(calculatePercentage(15, 10)).toBe(100);
  });

  it("calculates a quiz score after penalties", () => {
    expect(calculateQuizScore(9, 10, 2)).toBe(70);
    expect(calculateQuizScore(2, 10, 5)).toBe(0);
  });

  it("calculates attendance percentage safely", () => {
    expect(calculateAttendancePercentage(18, 20)).toBe(90);
    expect(calculateAttendancePercentage(0, 0)).toBe(0);
  });

  it("computes final subject and overall student averages", () => {
    expect(calculateFinalSubjectAverage([88, 90, 92, 94])).toBe(91);
    expect(calculateOverallStudentAverage([91, 87, 93])).toBe(90);
  });

  it("does not compute final averages from incomplete grades", () => {
    expect(calculateFinalSubjectAverage([88, 90, null, 94])).toBeNull();
    expect(calculateOverallStudentAverage([91, null, 93])).toBeNull();
  });
});
