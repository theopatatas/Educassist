import bcrypt from "bcryptjs";
import type { Transaction } from "sequelize";
import { sequelize } from "../../config/db";
import { sendMail } from "../../utils/mail";
import { PasswordResetOtp } from "../../db/models/PasswordResetOtp.model";
import { StudentSignupOtp } from "../../db/models/StudentSignupOtp.model";
import { Parent } from "../../db/models/Parent.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { User } from "../../db/models/User.model";
import { AdminAccountActivity } from "../../db/models/AdminAccountActivity.model";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import type { RegisterInput } from "./auth.schemas";

async function ensureGuardianAccountForStudent(
  input: {
    guardianName?: string | null;
    guardianContact?: string | null;
    firstName: string;
    lastName: string;
  },
  studentId: number,
  transaction: Transaction,
) {
  const guardianContact = input.guardianContact?.trim();
  if (!guardianContact) return;
  const guardianName = input.guardianName?.trim();
  const guardianNameParts = guardianName
    ? guardianName.split(/\s+/).filter(Boolean)
    : [];
  const guardianFirstName =
    guardianNameParts.length > 1
      ? guardianNameParts.slice(0, -1).join(" ")
      : guardianNameParts[0] || `Guardian of ${input.firstName}`;
  const guardianLastName =
    guardianNameParts.length > 1
      ? guardianNameParts[guardianNameParts.length - 1]
      : "";

  const existingParent = await Parent.findOne({
    where: { phone: guardianContact },
    transaction,
  });
  if (existingParent) {
    if (
      !existingParent.studentId ||
      existingParent.firstName.startsWith("Guardian of ")
    ) {
      await existingParent.update(
        {
          studentId: existingParent.studentId ?? studentId,
          firstName: guardianFirstName,
          lastName: guardianLastName,
        },
        { transaction },
      );
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
    { transaction },
  );

  await Parent.create(
    {
      userId: guardianUser.id,
      firstName: guardianFirstName,
      lastName: guardianLastName,
      phone: guardianContact,
      studentId,
    },
    { transaction },
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
  guardianName?: string | null;
  guardianContact?: string | null;
  sectionId?: number;
  sectionName?: string | null;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();

  return sequelize.transaction(async (t) => {
    return createStudentAccount(input, t);
  });
}

async function ensureStudentRegistrationAvailable(
  input: Pick<RegisterInput, "email" | "lrn">,
  transaction?: Transaction,
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await User.findOne({
    where: { email: normalizedEmail },
    transaction,
  });
  if (existing) {
    return {
      ok: false as const,
      code: 409 as const,
      message: "Email already in use",
    };
  }
  const existingStudentLrn = await Student.findOne({
    where: { lrn: input.lrn },
    transaction,
  });
  if (existingStudentLrn) {
    return {
      ok: false as const,
      code: 409 as const,
      message: "LRN already in use",
    };
  }
  const existingUserLrn = await User.findOne({
    where: { lrn: input.lrn },
    transaction,
  });
  if (existingUserLrn) {
    return {
      ok: false as const,
      code: 409 as const,
      message: "LRN already in use",
    };
  }
  return { ok: true as const };
}

async function createStudentAccount(
  input: {
    email: string;
    password?: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    lrn: string;
    yearLevel: string;
    middleName?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    guardianName?: string | null;
    guardianContact?: string | null;
    sectionId?: number;
    sectionName?: string | null;
  },
  transaction: Transaction,
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const availability = await ensureStudentRegistrationAvailable(
    { email: normalizedEmail, lrn: input.lrn },
    transaction,
  );
  if (!availability.ok) return availability;

  const passwordHash =
    input.passwordHash ?? (await bcrypt.hash(String(input.password ?? ""), 10));

  const user = await User.create(
    {
      email: normalizedEmail,
      passwordHash,
      role: "STUDENT",
      lrn: input.lrn,
      refreshTokenHash: null,
    },
    { transaction },
  );

  let resolvedSectionId: number | null = null;
  if (typeof input.sectionId === "number" && Number.isFinite(input.sectionId)) {
    const section = await Section.findByPk(input.sectionId, { transaction });
    resolvedSectionId = section ? Number(section.id) : null;
  }
  if (!resolvedSectionId && input.sectionName?.trim()) {
    const normalized = input.sectionName.trim();
    const [section] = await Section.findOrCreate({
      where: { name: normalized },
      defaults: { name: normalized },
      transaction,
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
    { transaction },
  );
  await ensureGuardianAccountForStudent(
    {
      guardianName: input.guardianName,
      guardianContact: input.guardianContact,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    Number(student.id),
    transaction,
  );

  const accessToken = signAccessToken({
    sub: String(user.id),
    role: user.role.toLowerCase(),
  });
  const refreshToken = signRefreshToken({ sub: String(user.id) });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.update({ refreshTokenHash }, { transaction });

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    accessToken,
    refreshToken,
  };
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
    return {
      ok: false as const,
      code: 401 as const,
      message: "Invalid credentials",
    };
  }

  if (!user.passwordHash) {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Invalid credentials",
    };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Invalid credentials",
    };
  }

  if (!user.isActive) {
    return {
      ok: false as const,
      code: 403 as const,
      message: "This account has been deactivated. Contact the administrator.",
    };
  }

  const accessToken = signAccessToken({
    sub: String(user.id),
    role: user.role.toLowerCase(),
  });
  const refreshToken = signRefreshToken({ sub: String(user.id) });

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.update({ refreshTokenHash, lastLoginAt: new Date() });
  if (user.role === "ADMIN") {
    await AdminAccountActivity.create({
      adminUserId: user.id,
      actorUserId: user.id,
      action: "Logged in",
      details: null,
    });
  }

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    accessToken,
    refreshToken,
  };
}

export async function refreshUserSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken) as { sub: string };
  } catch {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Invalid or expired refresh token",
    };
  }

  const user = await User.findByPk(payload.sub);
  if (!user || !user.refreshTokenHash) {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Session expired",
    };
  }

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Session expired",
    };
  }

  const accessToken = signAccessToken({
    sub: String(user.id),
    role: user.role.toLowerCase(),
  });
  const nextRefreshToken = signRefreshToken({ sub: String(user.id) });
  const refreshTokenHash = await bcrypt.hash(nextRefreshToken, 10);
  await user.update({ refreshTokenHash });

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await User.findByPk(userId);
  if (!user || !user.passwordHash) {
    return {
      ok: false as const,
      code: 404 as const,
      message: "User not found",
    };
  }

  const current = currentPassword.trim();
  const next = newPassword.trim();

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) {
    return {
      ok: false as const,
      code: 401 as const,
      message: "Current password is incorrect",
    };
  }

  const sameAsCurrent = await bcrypt.compare(next, user.passwordHash);
  if (sameAsCurrent) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "New password must be different",
    };
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await user.update({
    passwordHash,
    refreshTokenHash: null,
    passwordChangedAt: new Date(),
  });

  return { ok: true as const, message: "Password updated successfully" };
}

export async function verifyUserPassword(userId: string, password: string) {
  const user = await User.findByPk(userId);
  if (!user?.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

function generateSixDigitOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestStudentSignupOtp(input: RegisterInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const availability = await ensureStudentRegistrationAvailable({
    email: normalizedEmail,
    lrn: input.lrn,
  });
  if (!availability.ok) return availability;

  const otp = generateSixDigitOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await StudentSignupOtp.update(
    { usedAt: new Date() },
    { where: { email: normalizedEmail, usedAt: null } },
  );

  await StudentSignupOtp.create({
    email: normalizedEmail,
    otpHash,
    payload: JSON.stringify({
      ...input,
      email: normalizedEmail,
      passwordHash,
      password: undefined,
    }),
    expiresAt,
    usedAt: null,
  });

  const toName = `${input.firstName} ${input.lastName}`.trim() || "Student";
  await sendMail({
    to: normalizedEmail,
    toName,
    subject: "EducAssist Sign Up OTP",
    html: `<p>Hello ${toName},</p><p>Your EducAssist registration OTP is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
    text: `Hello ${toName}. Your EducAssist registration OTP is ${otp}. This code expires in 10 minutes.`,
  });

  return {
    ok: true as const,
    message: "OTP sent to your email address.",
    email: normalizedEmail,
  };
}

export async function verifyStudentSignupOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const pending = await StudentSignupOtp.findOne({
    where: { email: normalizedEmail, usedAt: null },
    order: [["createdAt", "DESC"]],
  });

  if (!pending) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Invalid OTP or email",
    };
  }
  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "OTP has expired",
    };
  }

  const validOtp = await bcrypt.compare(otp, pending.otpHash);
  if (!validOtp) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Invalid OTP or email",
    };
  }

  const payload = JSON.parse(String(pending.payload)) as RegisterInput & {
    passwordHash: string;
  };

  const result = await sequelize.transaction(async (t) => {
    const created = await createStudentAccount(
      {
        ...payload,
        email: normalizedEmail,
        passwordHash: payload.passwordHash,
      },
      t,
    );
    if (!created.ok) return created;
    await pending.update({ usedAt: new Date() }, { transaction: t });
    return created;
  });

  return result;
}

export async function requestStudentPasswordResetOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  // Do not reveal whether the account exists.
  if (!user || String(user.role).toUpperCase() !== "STUDENT") {
    return {
      ok: true as const,
      message: "If the email exists, an OTP has been sent.",
    };
  }

  const otp = generateSixDigitOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await PasswordResetOtp.update(
    { usedAt: new Date() },
    { where: { userId: user.id, usedAt: null } },
  );

  await PasswordResetOtp.create({
    userId: user.id,
    otpHash,
    expiresAt,
    verifiedAt: null,
    usedAt: null,
  });

  let toName = "Student";
  const student = await Student.findOne({ where: { userId: user.id } });
  if (student) {
    toName =
      `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
      "Student";
  }

  await sendMail({
    to: user.email,
    toName,
    subject: "EducAssist Password Reset OTP",
    html: `<p>Hello ${toName},</p><p>Your EducAssist OTP is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
    text: `Hello ${toName}. Your EducAssist OTP is ${otp}. This code expires in 10 minutes.`,
  });

  return {
    ok: true as const,
    message: "If the email exists, an OTP has been sent.",
  };
}

export async function verifyStudentPasswordResetOtp(
  email: string,
  otp: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user || String(user.role).toUpperCase() !== "STUDENT") {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Invalid OTP or email",
    };
  }

  const latestOtp = await PasswordResetOtp.findOne({
    where: { userId: user.id, usedAt: null },
    order: [["createdAt", "DESC"]],
  });

  if (!latestOtp) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Invalid OTP or email",
    };
  }

  if (new Date(latestOtp.expiresAt).getTime() < Date.now()) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "OTP has expired",
    };
  }

  const validOtp = await bcrypt.compare(otp, latestOtp.otpHash);
  if (!validOtp) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Invalid OTP or email",
    };
  }

  await latestOtp.update({ verifiedAt: new Date() });

  return {
    ok: true as const,
    message: "OTP verified. You can now reset your password.",
  };
}

export async function resetStudentPasswordWithOtp(
  email: string,
  newPassword: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user || String(user.role).toUpperCase() !== "STUDENT") {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Reset session is invalid",
    };
  }

  const latestOtp = await PasswordResetOtp.findOne({
    where: { userId: user.id, usedAt: null },
    order: [["createdAt", "DESC"]],
  });

  if (!latestOtp) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Reset session is invalid",
    };
  }

  if (new Date(latestOtp.expiresAt).getTime() < Date.now()) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "OTP has expired",
    };
  }

  if (!latestOtp.verifiedAt) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Verify OTP first",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash, refreshTokenHash: null });
  await latestOtp.update({ usedAt: new Date() });

  return {
    ok: true as const,
    message: "Password reset successful. You can now log in.",
  };
}
