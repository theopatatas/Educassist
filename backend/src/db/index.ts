import bcrypt from "bcryptjs";
import { sequelize } from "../config/db";
import { env } from "../config/env";
import { User } from "./models";
import "./models"; // <- this must run first (registers User/Teacher/Student)

export async function initDb() {
  await sequelize.authenticate();
  // Avoid repeated ALTER operations that can duplicate indexes in MySQL.
  await sequelize.sync();
  // Lightweight schema patch for existing databases that predate exam start time.
  // This avoids enabling global `sync({ alter: true })`, which can generate noisy/unsafe ALTERs.
  try {
    const qi = sequelize.getQueryInterface();
    const exams = await qi.describeTable("exams");
    if (!("start_time" in exams)) {
      await qi.sequelize.query("ALTER TABLE `exams` ADD COLUMN `start_time` VARCHAR(20) NULL AFTER `exam_date`;");
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }

  if (env.ADMIN_SEED_EMAIL && env.ADMIN_SEED_PASSWORD) {
    const passwordHash = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 10);
    const existing = await User.findOne({ where: { email: env.ADMIN_SEED_EMAIL } });
    if (existing) {
      await existing.update({ passwordHash, role: "ADMIN" });
    } else {
      await User.create({
        email: env.ADMIN_SEED_EMAIL,
        passwordHash,
        role: "ADMIN",
        refreshTokenHash: null,
      });
    }
  }
}
