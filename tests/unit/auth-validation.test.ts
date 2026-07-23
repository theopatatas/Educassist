import { describe, expect, it } from "vitest";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "../../backend/src/modules/auth/auth.schemas";
import { roleHome } from "../../src/features/auth/rbac";

describe("authentication validation", () => {
  it("rejects empty and short login input", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ email: "user", password: "1234" }).success,
    ).toBe(false);
  });

  it("accepts the existing phone-or-email login identifier behavior", () => {
    expect(
      loginSchema.safeParse({ email: "09123456789", password: "12345678" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing refresh token", () => {
    expect(refreshTokenSchema.safeParse({}).success).toBe(false);
  });

  it("rejects missing registration requirements", () => {
    expect(registerSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("role routing", () => {
  it.each([
    ["super_admin", "/admin"],
    ["admin", "/staff-admin"],
    ["teacher", "/teacher"],
    ["student", "/student"],
    ["parent", "/parent"],
  ] as const)("routes %s to %s", (role, path) => {
    expect(roleHome(role)).toBe(path);
  });
});
