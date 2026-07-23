import { beforeAll, describe, expect, it } from "vitest";

describe("JWT helpers", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  });

  it("signs and verifies access and refresh tokens", async () => {
    const jwt = await import("../../backend/src/utils/jwt");
    const access = jwt.signAccessToken({ sub: "42", role: "teacher" });
    const refresh = jwt.signRefreshToken({ sub: "42" });
    expect(jwt.verifyAccessToken(access)).toMatchObject({
      sub: "42",
      role: "teacher",
    });
    expect(jwt.verifyRefreshToken(refresh)).toMatchObject({ sub: "42" });
  });

  it("rejects an invalid token", async () => {
    const jwt = await import("../../backend/src/utils/jwt");
    expect(() => jwt.verifyAccessToken("not-a-token")).toThrow();
  });
});
