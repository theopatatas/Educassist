import request from "supertest";
import { createHmac } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../backend/src/app";
import { signAccessToken } from "../../backend/src/utils/jwt";
import { requireAuth } from "../../backend/src/middleware/auth.middleware";
import { requireRole } from "../../backend/src/middleware/role.middleware";
import { Student } from "../../backend/src/db/models/Student.model";

const app = createApp();
const roleApp = createApp();
roleApp.get(
  "/super-admin",
  requireAuth,
  requireRole("admin"),
  (_req, res) => res.json({ ok: true }),
);
roleApp.get(
  "/admin",
  requireAuth,
  requireRole("managed_admin"),
  (_req, res) => res.json({ ok: true }),
);
roleApp.get(
  "/teacher",
  requireAuth,
  requireRole("teacher"),
  (_req, res) => res.json({ ok: true }),
);
roleApp.get(
  "/student",
  requireAuth,
  requireRole("student"),
  (_req, res) => res.json({ ok: true }),
);
roleApp.get(
  "/parent",
  requireAuth,
  requireRole("parent"),
  (_req, res) => res.json({ ok: true }),
);

function expiredAccessToken() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: "1",
    role: "teacher",
    exp: Math.floor(Date.now() / 1000) - 60,
  })}`;
  const signature = createHmac("sha256", "test-access-secret")
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

describe("Express API request validation and access control", () => {
  it("serves the database-independent health route", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("rejects an invalid login body", async () => {
    const response = await request(app).post("/api/auth/login").send({});
    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it("rejects a missing bearer token", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/missing bearer token/i);
  });

  it("rejects an invalid bearer token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");
    expect(response.status).toBe(401);
  });

  it("rejects an expired bearer token", async () => {
    const token = expiredAccessToken();
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it("forbids a teacher from Super Admin user management", async () => {
    const token = signAccessToken({ sub: "1", role: "teacher" });
    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/forbidden/i);
  });
});

describe("role middleware preserves existing role mapping", () => {
  const studentLookup = vi.spyOn(Student, "findOne").mockResolvedValue(null);

  afterAll(() => {
    studentLookup.mockRestore();
  });

  for (const [path, role] of [
    ["/super-admin", "super_admin"],
    ["/admin", "admin"],
    ["/teacher", "teacher"],
    ["/student", "student"],
    ["/parent", "parent"],
  ] as const) {
    it(`allows ${role} through its existing route mapping`, async () => {
      const token = signAccessToken({ sub: "1", role });
      const response = await request(roleApp)
        .get(path)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  }
});
