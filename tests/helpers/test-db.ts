export function assertSafeTestDatabaseName(name: string | undefined) {
  if (!name || !/test/i.test(name) || name === "educassist_db") {
    throw new Error(
      "Refusing database integration tests: DB_NAME_TEST must clearly identify a test database.",
    );
  }
}

export function databaseIntegrationEnabled() {
  return process.env.RUN_DB_INTEGRATION === "true";
}

export async function getTestSequelize() {
  assertSafeTestDatabaseName(process.env.DB_NAME_TEST);
  const { sequelize } = await import("../../backend/src/config/db");
  return sequelize;
}
