import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "../../src/lib/http/errorMessage";

describe("getApiErrorMessage", () => {
  it("returns the backend message when it is a non-empty string", () => {
    expect(
      getApiErrorMessage(
        { response: { data: { message: "Email is already registered." } } },
        "Fallback",
      ),
    ).toBe("Email is already registered.");
  });

  it("returns the existing fallback for malformed or empty errors", () => {
    expect(getApiErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(
      getApiErrorMessage(
        { response: { data: { message: "" } } },
        "Fallback",
      ),
    ).toBe("Fallback");
    expect(
      getApiErrorMessage(
        { response: { data: { message: 500 } } },
        "Fallback",
      ),
    ).toBe("Fallback");
  });
});
