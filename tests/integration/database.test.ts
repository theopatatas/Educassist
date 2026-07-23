import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertSafeTestDatabaseName,
  databaseIntegrationEnabled,
  getTestSequelize,
} from "../helpers/test-db";

const describeDatabase = databaseIntegrationEnabled()
  ? describe
  : describe.skip;

describe("test database safety guard", () => {
  it("rejects the development database name", () => {
    expect(() => assertSafeTestDatabaseName("educassist_db")).toThrow(
      /refusing/i,
    );
  });
});

describeDatabase("Sequelize integration against DB_NAME_TEST", () => {
  let sequelize: Awaited<ReturnType<typeof getTestSequelize>>;

  beforeAll(async () => {
    sequelize = await getTestSequelize();
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it("connects to the explicitly configured test database", async () => {
    const [rows] = await sequelize.query("SELECT DATABASE() AS databaseName");
    expect(String((rows[0] as { databaseName: string }).databaseName)).toMatch(
      /test/i,
    );
  });

  it("rolls back a created user without destructive cleanup", async () => {
    const { User } = await import("../../backend/src/db/models/User.model");
    const email = `rollback-${Date.now()}@example.test`;
    await expect(
      sequelize.transaction(async (transaction) => {
        await User.create(
          { email, role: "STUDENT", isActive: true },
          { transaction },
        );
        throw new Error("rollback-test");
      }),
    ).rejects.toThrow("rollback-test");
    expect(await User.count({ where: { email } })).toBe(0);
  });

  it("enforces the unique email constraint inside a rolled-back transaction", async () => {
    const { User } = await import("../../backend/src/db/models/User.model");
    const email = `unique-${Date.now()}@example.test`;
    await expect(
      sequelize.transaction(async (transaction) => {
        await User.create(
          { email, role: "STUDENT", isActive: true },
          { transaction },
        );
        await User.create(
          { email, role: "STUDENT", isActive: true },
          { transaction },
        );
      }),
    ).rejects.toMatchObject({ name: "SequelizeUniqueConstraintError" });
    expect(await User.count({ where: { email } })).toBe(0);
  });

  it("commits and then safely deletes one test-only user", async () => {
    const { User } = await import("../../backend/src/db/models/User.model");
    const email = `commit-${Date.now()}@example.test`;
    const user = await sequelize.transaction((transaction) =>
      User.create({ email, role: "STUDENT", isActive: true }, { transaction }),
    );
    expect(await User.findByPk(user.id)).not.toBeNull();
    await user.destroy();
    expect(await User.findByPk(user.id)).toBeNull();
  });
});
