"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const models_1 = require("./models");
require("./models"); // <- this must run first (registers User/Teacher/Student)
async function initDb() {
    await db_1.sequelize.authenticate();
    // Avoid repeated ALTER operations that can duplicate indexes in MySQL.
    await db_1.sequelize.sync();
    // Lightweight schema patch for existing databases that predate exam start time.
    // This avoids enabling global `sync({ alter: true })`, which can generate noisy/unsafe ALTERs.
    try {
        const qi = db_1.sequelize.getQueryInterface();
        const exams = await qi.describeTable("exams");
        if (!("start_time" in exams)) {
            await qi.sequelize.query("ALTER TABLE `exams` ADD COLUMN `start_time` VARCHAR(20) NULL AFTER `exam_date`;");
        }
    }
    catch {
        // Ignore if table does not exist yet during first boot; sync will create it.
    }
    if (env_1.env.ADMIN_SEED_EMAIL && env_1.env.ADMIN_SEED_PASSWORD) {
        const passwordHash = await bcryptjs_1.default.hash(env_1.env.ADMIN_SEED_PASSWORD, 10);
        const existing = await models_1.User.findOne({ where: { email: env_1.env.ADMIN_SEED_EMAIL } });
        if (existing) {
            await existing.update({ passwordHash, role: "ADMIN" });
        }
        else {
            await models_1.User.create({
                email: env_1.env.ADMIN_SEED_EMAIL,
                passwordHash,
                role: "ADMIN",
                refreshTokenHash: null,
            });
        }
    }
}
