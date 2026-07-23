import "dotenv/config";
import mysql from "mysql2/promise";
import { sequelize } from "../config/db";
import { env } from "../config/env";
import { initializeDatabase } from "../db";

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } finally {
    await connection.end();
  }
}

async function main() {
  await ensureDatabaseExists();
  await initializeDatabase({ force: true });

  console.log("");
  console.log("Database rebuilt successfully.");
  console.log(`Database: ${env.DB_NAME}`);
  console.log(`Admin email: ${env.ADMIN_SEED_EMAIL ?? "(not configured)"}`);
  console.log(
    `Admin password: ${
      env.ADMIN_SEED_PASSWORD ? "(seeded from ADMIN_SEED_PASSWORD in backend/.env)" : "(not configured)"
    }`
  );
  console.log("Default subject seed completed.");
}

main()
  .catch((error) => {
    console.error("Failed to rebuild database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
