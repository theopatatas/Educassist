"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promise_1 = __importDefault(require("mysql2/promise"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const db_2 = require("../db");
async function ensureDatabaseExists() {
    const connection = await promise_1.default.createConnection({
        host: env_1.env.DB_HOST,
        port: env_1.env.DB_PORT,
        user: env_1.env.DB_USER,
        password: env_1.env.DB_PASS,
        multipleStatements: true,
    });
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env_1.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    }
    finally {
        await connection.end();
    }
}
async function main() {
    await ensureDatabaseExists();
    await (0, db_2.initializeDatabase)({ force: true });
    console.log("");
    console.log("Database rebuilt successfully.");
    console.log(`Database: ${env_1.env.DB_NAME}`);
    console.log(`Admin email: ${env_1.env.ADMIN_SEED_EMAIL ?? "(not configured)"}`);
    console.log(`Admin password: ${env_1.env.ADMIN_SEED_PASSWORD ? "(seeded from ADMIN_SEED_PASSWORD in backend/.env)" : "(not configured)"}`);
    console.log("Default subject seed completed.");
}
main()
    .catch((error) => {
    console.error("Failed to rebuild database.");
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await db_1.sequelize.close().catch(() => undefined);
});
