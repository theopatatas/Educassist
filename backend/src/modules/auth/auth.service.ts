import bcrypt from "bcryptjs";
import type { Transaction } from "sequelize";
import { sequelize } from "../../config/db";
import { Parent } from "../../db/models/Parent.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { User } from "../../db/models/User.model";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";

async function ensureGuardianAccountForStudent(
  input: { guardianContact?: string | null; firstName: string; lastName: string },
  studentId: number,
  transaction: Transaction
) {
  const guardianContact = input.guardianContact?.trim();
  if (!guardianContact) return;

  const existingParent = await Parent.findOne({ where: { phone: guardianContact }, transaction });
  if (existingParent) {
    if (!existingParent.studentId) {
      await existingParent.update({ studentId }, { transaction });
    }
    return;
  }

  let loginId = guardianContact;
  let suffix = 1;
  while (await User.findOne({ where: { email: loginId }, transaction })) {
    suffix += 1;
    loginId = `${guardianContact}_${suffix}`;
  }

  const passwordHash = await bcrypt.hash("12345678", 10);
  const guardianUser = await User.create(
    {
      email: loginId,
      passwordHash,
      role: "parent",
      refreshTokenHash: null,
    },
    { transaction }
  );

  await Parent.create(
    {
      userId: guardianUser.id,
      firstName: `Guardian of ${input.firstName}`,
      lastName: input.lastName,
      phone: guardianContact,
      studentId,
    },
    { transaction }
  );
}

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  lrn: string;
  yearLevel: string;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  guardianContact?: string | null;
  sectionId?: number;
  sectionName?: string | null;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();

  return sequelize.transaction(async (t) => {
    const existing = await User.findOne({ where: { email: normalizedEmail }, transaction: t });
    if (existing) {
      return { ok: false as const, code: 409 as const, message: "Email already in use" };
    }
    const existingStudentLrn = await Student.findOne({ where: { lrn: input.lrn }, transaction: t });
    if (existingStudentLrn) {
      return { ok: false as const, code: 409 as const, message: "LRN already in use" };
    }
    const existingUserLrn = await User.findOne({ where: { lrn: input.lrn }, transaction: t });
    if (existingUserLrn) {
      return { ok: false as const, code: 409 as const, message: "LRN already in use" };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await User.create(
      {
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
        lrn: input.lrn,
        refreshTokenHash: null,
      },
      { transaction: t }
    );

    let resolvedSectionId: number | null = null;
    if (typeof input.sectionId === "number" && Number.isFinite(input.sectionId)) {
      const section = await Section.findByPk(input.sectionId, { transaction: t });
      resolvedSectionId = section ? Number(section.id) : null;
    }
    if (!resolvedSectionId && input.sectionName?.trim()) {
      const normalized = input.sectionName.trim();
      const [section] = await Section.findOrCreate({
        where: { name: normalized },
        defaults: { name: normalized },
        transaction: t,
      });
      resolvedSectionId = Number(section.id);
    }

    const student = await Student.create(
      {
        userId: user.id,
        lrn: input.lrn,
        firstName: input.firstName,
        lastName: input.lastName,
        yearLevel: input.yearLevel,
        middleName: input.middleName ?? null,
        birthDate: input.birthDate ?? null,
        gender: input.gender ?? null,
        guardianContact: input.guardianContact ?? null,
        sectionId: resolvedSectionId,
      },
      { transaction: t }
    );
    await ensureGuardianAccountForStudent(
      {
        guardianContact: input.guardianContact,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      Number(student.id),
      t
    );

    const accessToken = signAccessToken({ sub: String(user.id), role: user.role.toLowerCase() });
    const refreshToken = signRefreshToken({ sub: String(user.id) });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.update({ refreshTokenHash }, { transaction: t });

    return {
      ok: true as const,
      user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
      accessToken,
      refreshToken,
    };
  });
}

export async function loginUser(email: string, password: string) {
  const rawIdentifier = email.trim();
  const identifier = rawIdentifier.toLowerCase();
  let user: User | null = null;
  if (!rawIdentifier.includes("@")) {
    const parent = await Parent.findOne({ where: { phone: rawIdentifier } });
    if (parent) user = await User.findByPk(parent.userId);
  }
  if (!user) user = await User.findOne({ where: { email: identifier } });
  if (!user) {
    return { ok: false as const, code: 401 as const, message: "Invalid credentials" };
  }

  if (!user.passwordHash) {
    return { ok: false as const, code: 401 as const, message: "Invalid credentials" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false as const, code: 401 as const, message: "Invalid credentials" };
  }

  const accessToken = signAccessToken({ sub: String(user.id), role: user.role.toLowerCase() });
  const refreshToken = signRefreshToken({ sub: String(user.id) });

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.update({ refreshTokenHash });

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    accessToken,
    refreshToken,
  };
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findByPk(userId);
  if (!user || !user.passwordHash) {
    return { ok: false as const, code: 404 as const, message: "User not found" };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false as const, code: 401 as const, message: "Current password is incorrect" };
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return { ok: false as const, code: 400 as const, message: "New password must be different" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash });

  return { ok: true as const, message: "Password updated successfully" };
}
