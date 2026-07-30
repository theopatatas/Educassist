import { describe, expect, it } from "vitest";
import {
  ACADEMIC_TERMS,
  gradeItemTermCandidates,
  normalizeActiveAcademicTerm,
  normalizeAcademicPeriodText,
  normalizeAcademicTerm,
} from "../../backend/src/utils/academic-terms";

describe("academic term compatibility", () => {
  it("supports exactly three current academic terms", () => {
    expect(ACADEMIC_TERMS).toEqual(["Term 1", "Term 2", "Term 3"]);
  });

  it("normalizes current and historical grading labels", () => {
    expect(normalizeAcademicTerm("Term 1")).toBe("Term 1");
    expect(normalizeAcademicTerm("Quarter 2")).toBe("Term 2");
    expect(normalizeAcademicTerm("3rd Grading")).toBe("Term 3");
    expect(normalizeAcademicTerm("Quarter 4")).toBe("");
    expect(normalizeActiveAcademicTerm("Quarter 4")).toBe("Term 3");
  });

  it("provides current and legacy grade-item labels for historical reads", () => {
    expect(gradeItemTermCandidates("Term 2")).toEqual([
      "Term 2",
      "2nd Grading",
    ]);
  });

  it("normalizes legacy period wording before it reaches the UI", () => {
    expect(
      normalizeAcademicPeriodText(
        "Quarter 4 deadline. Encoding quarter: Quarter 4.",
      ),
    ).toBe("Term 3 deadline. Encoding term: Term 3.");
  });
});
