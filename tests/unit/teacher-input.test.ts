import { describe, expect, it } from "vitest";
import { sanitizeTeacherSentence } from "@/src/lib/utils/teacherInput";

describe("teacher text input restrictions", () => {
  it("keeps ordinary sentence punctuation", () => {
    expect(
      sanitizeTeacherSentence(
        `What is Rizal's role, and why? "Explain it." (5 points): Yes!`,
      ),
    ).toBe(
      `What is Rizal's role, and why? "Explain it." (5 points): Yes!`,
    );
  });

  it("removes entities, markup, and programming characters", () => {
    expect(
      sanitizeTeacherSentence(
        "Lesson &amp; <script>{alert(1)}</script> total = $100 #1;",
      ),
    ).toBe("Lesson amp scriptalert(1)script total  100 1");
  });

  it("preserves letters from Filipino and other languages", () => {
    expect(sanitizeTeacherSentence("Aralín: Niño, Kumustá?")).toBe(
      "Aralín: Niño, Kumustá?",
    );
  });
});
