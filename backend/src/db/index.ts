import bcrypt from "bcryptjs";
import { sequelize } from "../config/db";
import { env } from "../config/env";
import { Subject, User } from "./models";
import "./models"; // <- this must run first (registers User/Teacher/Student)

const DEFAULT_SUBJECTS = [
  { name: "Math", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "English", code: "ENG" },
  { name: "Filipino", code: "FIL" },
  { name: "MAPEH", code: "MAPEH" },
  { name: "AP", code: "AP" },
  { name: "TLE", code: "TLE" },
  { name: "Values", code: "VALUES" },
  { name: "PE", code: "PE" },
  { name: "ESP", code: "ESP" },
] as const;

export async function applySchemaPatches() {
  try {
    const qi = sequelize.getQueryInterface();
    const users = await qi.describeTable("users");
    await qi.sequelize.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('SUPER_ADMIN','ADMIN','TEACHER','STUDENT','PARENT') NOT NULL DEFAULT 'STUDENT';",
    );
    if (!("first_name" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `first_name` VARCHAR(100) NULL AFTER `email`;",
      );
    }
    if (!("middle_name" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `middle_name` VARCHAR(100) NULL AFTER `first_name`;",
      );
    }
    if (!("last_name" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `last_name` VARCHAR(100) NULL AFTER `middle_name`;",
      );
    }
    if (!("mobile_number" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `mobile_number` VARCHAR(11) NULL AFTER `last_name`;",
      );
    }
    if (!("profile_photo_url" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `profile_photo_url` VARCHAR(500) NULL AFTER `mobile_number`;",
      );
    }
    if (!("display_name" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `display_name` VARCHAR(150) NULL AFTER `mobile_number`;",
      );
    }
    if (!("password_changed_at" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `password_changed_at` DATETIME NULL AFTER `last_login_at`;",
      );
    }
    if (!("created_by_id" in users)) {
      await qi.sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `created_by_id` BIGINT UNSIGNED NULL AFTER `last_login_at`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const teachers = await qi.describeTable("teachers");
    if (!("middle_name" in teachers)) {
      await qi.sequelize.query(
        "ALTER TABLE `teachers` ADD COLUMN `middle_name` VARCHAR(100) NULL AFTER `last_name`;",
      );
    }
    if (!("contact_number" in teachers)) {
      await qi.sequelize.query(
        "ALTER TABLE `teachers` ADD COLUMN `contact_number` VARCHAR(50) NULL AFTER `middle_name`;",
      );
    }
    if (!("gender" in teachers)) {
      await qi.sequelize.query(
        "ALTER TABLE `teachers` ADD COLUMN `gender` VARCHAR(20) NULL AFTER `contact_number`;",
      );
    }
    if (!("archived_at" in teachers)) {
      await qi.sequelize.query(
        "ALTER TABLE `teachers` ADD COLUMN `archived_at` DATETIME NULL AFTER `gender`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const students = await qi.describeTable("students");
    if (!("student_mobile_number" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `student_mobile_number` VARCHAR(11) NULL AFTER `lrn`;",
      );
    }
    if (!("guardian_name" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `guardian_name` VARCHAR(200) NULL AFTER `guardian_contact`;",
      );
    }
    if (!("mother_name" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `mother_name` VARCHAR(200) NULL AFTER `guardian_name`;",
      );
    }
    if (!("father_name" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `father_name` VARCHAR(200) NULL AFTER `mother_name`;",
      );
    }
    if (!("previous_grade_level" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `previous_grade_level` VARCHAR(20) NULL AFTER `year_level`;",
      );
    }
    if (!("promoted_at" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `promoted_at` DATETIME NULL AFTER `previous_grade_level`;",
      );
    }
    if (!("graduated_at" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `graduated_at` DATETIME NULL AFTER `promoted_at`;",
      );
    }
    if (!("archived_at" in students)) {
      await qi.sequelize.query(
        "ALTER TABLE `students` ADD COLUMN `archived_at` DATETIME NULL AFTER `graduated_at`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const subjects = await qi.describeTable("subjects");
    if (!("created_by_admin" in subjects)) {
      await qi.sequelize.query(
        "ALTER TABLE `subjects` ADD COLUMN `created_by_admin` TINYINT NOT NULL DEFAULT 0 AFTER `code`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const schoolEvents = await qi.describeTable("school_events");
    await qi.sequelize.query(
      "ALTER TABLE `school_events` MODIFY COLUMN `category` VARCHAR(60) NOT NULL;",
    );
    if (!("end_date" in schoolEvents)) {
      await qi.sequelize.query(
        "ALTER TABLE `school_events` ADD COLUMN `end_date` DATE NULL AFTER `event_date`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const classes = await qi.describeTable("classes");
    if (!("building_name" in classes)) {
      await qi.sequelize.query(
        "ALTER TABLE `classes` ADD COLUMN `building_name` VARCHAR(120) NULL AFTER `grade_level`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const exams = await qi.describeTable("exams");
    if (!("start_time" in exams)) {
      await qi.sequelize.query(
        "ALTER TABLE `exams` ADD COLUMN `start_time` VARCHAR(20) NULL AFTER `exam_date`;",
      );
    }
    if (!("reviewer_json" in exams)) {
      await qi.sequelize.query(
        "ALTER TABLE `exams` ADD COLUMN `reviewer_json` JSON NULL AFTER `coverage_json`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const passwordResetOtps = await qi.describeTable("password_reset_otps");
    if (!("verified_at" in passwordResetOtps)) {
      await qi.sequelize.query(
        "ALTER TABLE `password_reset_otps` ADD COLUMN `verified_at` DATETIME NULL AFTER `expires_at`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const questionBank = await qi.describeTable("question_bank");
    if (!("question_type" in questionBank)) {
      await qi.sequelize.query(
        "ALTER TABLE `question_bank` ADD COLUMN `question_type` VARCHAR(40) NOT NULL DEFAULT 'multiple_choice' AFTER `question_text`;",
      );
    }
    if (!("points" in questionBank)) {
      await qi.sequelize.query(
        "ALTER TABLE `question_bank` ADD COLUMN `points` INT NOT NULL DEFAULT 1 AFTER `question_type`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
  try {
    const qi = sequelize.getQueryInterface();
    const quizAttempts = await qi.describeTable("quiz_attempts");
    if (!("penalty_points" in quizAttempts)) {
      await qi.sequelize.query(
        "ALTER TABLE `quiz_attempts` ADD COLUMN `penalty_points` INT NOT NULL DEFAULT 0 AFTER `score`;",
      );
    }
  } catch {
    // Ignore if table does not exist yet during first boot; sync will create it.
  }
}

export async function seedReferenceData() {
  for (const subject of DEFAULT_SUBJECTS) {
    const existing = await Subject.findOne({ where: { name: subject.name } });
    if (existing) {
      if (existing.code !== subject.code) {
        await existing.update({ code: subject.code });
      }
      continue;
    }

    await Subject.create({
      name: subject.name,
      code: subject.code,
    });
  }
}

export async function seedAdminUser() {
  if (env.ADMIN_SEED_EMAIL && env.ADMIN_SEED_PASSWORD) {
    const passwordHash = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 10);
    const existing = await User.findOne({
      where: { email: env.ADMIN_SEED_EMAIL },
    });
    if (existing) {
      await existing.update({ passwordHash, role: "SUPER_ADMIN" });
    } else {
      await User.create({
        email: env.ADMIN_SEED_EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
        refreshTokenHash: null,
      });
    }
  }
}

export async function initializeDatabase(options?: { force?: boolean }) {
  await sequelize.authenticate();
  // Avoid repeated ALTER operations that can duplicate indexes in MySQL.
  await sequelize.sync({ force: options?.force ?? false });
  await applySchemaPatches();
  await seedReferenceData();
  await seedAdminUser();
}

export async function initDb() {
  await initializeDatabase();
}
