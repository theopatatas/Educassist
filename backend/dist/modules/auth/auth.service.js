"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshUserSession = refreshUserSession;
exports.changeUserPassword = changeUserPassword;
exports.verifyUserPassword = verifyUserPassword;
exports.requestStudentSignupOtp = requestStudentSignupOtp;
exports.verifyStudentSignupOtp = verifyStudentSignupOtp;
exports.requestStudentPasswordResetOtp = requestStudentPasswordResetOtp;
exports.verifyStudentPasswordResetOtp = verifyStudentPasswordResetOtp;
exports.resetStudentPasswordWithOtp = resetStudentPasswordWithOtp;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const mail_1 = require("../../utils/mail");
const PasswordResetOtp_model_1 = require("../../db/models/PasswordResetOtp.model");
const StudentSignupOtp_model_1 = require("../../db/models/StudentSignupOtp.model");
const Parent_model_1 = require("../../db/models/Parent.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const User_model_1 = require("../../db/models/User.model");
const AdminAccountActivity_model_1 = require("../../db/models/AdminAccountActivity.model");
const jwt_1 = require("../../utils/jwt");
async function ensureGuardianAccountForStudent(input, studentId, transaction) {
    const guardianContact = input.guardianContact?.trim();
    if (!guardianContact)
        return;
    const guardianName = input.guardianName?.trim();
    const guardianNameParts = guardianName
        ? guardianName.split(/\s+/).filter(Boolean)
        : [];
    const guardianFirstName = guardianNameParts.length > 1
        ? guardianNameParts.slice(0, -1).join(" ")
        : guardianNameParts[0] || `Guardian of ${input.firstName}`;
    const guardianLastName = guardianNameParts.length > 1
        ? guardianNameParts[guardianNameParts.length - 1]
        : "";
    const existingParent = await Parent_model_1.Parent.findOne({
        where: { phone: guardianContact },
        transaction,
    });
    if (existingParent) {
        if (!existingParent.studentId ||
            existingParent.firstName.startsWith("Guardian of ")) {
            await existingParent.update({
                studentId: existingParent.studentId ?? studentId,
                firstName: guardianFirstName,
                lastName: guardianLastName,
            }, { transaction });
        }
        return;
    }
    let loginId = guardianContact;
    let suffix = 1;
    while (await User_model_1.User.findOne({ where: { email: loginId }, transaction })) {
        suffix += 1;
        loginId = `${guardianContact}_${suffix}`;
    }
    const passwordHash = await bcryptjs_1.default.hash("12345678", 10);
    const guardianUser = await User_model_1.User.create({
        email: loginId,
        passwordHash,
        role: "parent",
        refreshTokenHash: null,
    }, { transaction });
    await Parent_model_1.Parent.create({
        userId: guardianUser.id,
        firstName: guardianFirstName,
        lastName: guardianLastName,
        phone: guardianContact,
        studentId,
    }, { transaction });
}
async function registerUser(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    return db_1.sequelize.transaction(async (t) => {
        return createStudentAccount(input, t);
    });
}
async function ensureStudentRegistrationAvailable(input, transaction) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await User_model_1.User.findOne({
        where: { email: normalizedEmail },
        transaction,
    });
    if (existing) {
        return {
            ok: false,
            code: 409,
            message: "Email already in use",
        };
    }
    const existingStudentLrn = await Student_model_1.Student.findOne({
        where: { lrn: input.lrn },
        transaction,
    });
    if (existingStudentLrn) {
        return {
            ok: false,
            code: 409,
            message: "LRN already in use",
        };
    }
    const existingUserLrn = await User_model_1.User.findOne({
        where: { lrn: input.lrn },
        transaction,
    });
    if (existingUserLrn) {
        return {
            ok: false,
            code: 409,
            message: "LRN already in use",
        };
    }
    return { ok: true };
}
async function createStudentAccount(input, transaction) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const availability = await ensureStudentRegistrationAvailable({ email: normalizedEmail, lrn: input.lrn }, transaction);
    if (!availability.ok)
        return availability;
    const passwordHash = input.passwordHash ?? (await bcryptjs_1.default.hash(String(input.password ?? ""), 10));
    const user = await User_model_1.User.create({
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
        lrn: input.lrn,
        refreshTokenHash: null,
    }, { transaction });
    let resolvedSectionId = null;
    if (typeof input.sectionId === "number" && Number.isFinite(input.sectionId)) {
        const section = await Section_model_1.Section.findByPk(input.sectionId, { transaction });
        resolvedSectionId = section ? Number(section.id) : null;
    }
    if (!resolvedSectionId && input.sectionName?.trim()) {
        const normalized = input.sectionName.trim();
        const [section] = await Section_model_1.Section.findOrCreate({
            where: { name: normalized },
            defaults: { name: normalized },
            transaction,
        });
        resolvedSectionId = Number(section.id);
    }
    const student = await Student_model_1.Student.create({
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
    }, { transaction });
    await ensureGuardianAccountForStudent({
        guardianName: input.guardianName,
        guardianContact: input.guardianContact,
        firstName: input.firstName,
        lastName: input.lastName,
    }, Number(student.id), transaction);
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: String(user.id),
        role: user.role.toLowerCase(),
    });
    const refreshToken = (0, jwt_1.signRefreshToken)({ sub: String(user.id) });
    const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, 10);
    await user.update({ refreshTokenHash }, { transaction });
    return {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
        accessToken,
        refreshToken,
    };
}
async function loginUser(email, password) {
    const rawIdentifier = email.trim();
    const identifier = rawIdentifier.toLowerCase();
    let user = null;
    if (!rawIdentifier.includes("@")) {
        const parent = await Parent_model_1.Parent.findOne({ where: { phone: rawIdentifier } });
        if (parent)
            user = await User_model_1.User.findByPk(parent.userId);
    }
    if (!user)
        user = await User_model_1.User.findOne({ where: { email: identifier } });
    if (!user) {
        return {
            ok: false,
            code: 401,
            message: "Invalid credentials",
        };
    }
    if (!user.passwordHash) {
        return {
            ok: false,
            code: 401,
            message: "Invalid credentials",
        };
    }
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        return {
            ok: false,
            code: 401,
            message: "Invalid credentials",
        };
    }
    if (!user.isActive) {
        return {
            ok: false,
            code: 403,
            message: "This account has been deactivated. Contact the administrator.",
        };
    }
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: String(user.id),
        role: user.role.toLowerCase(),
    });
    const refreshToken = (0, jwt_1.signRefreshToken)({ sub: String(user.id) });
    const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, 10);
    await user.update({ refreshTokenHash, lastLoginAt: new Date() });
    if (user.role === "ADMIN") {
        await AdminAccountActivity_model_1.AdminAccountActivity.create({
            adminUserId: user.id,
            actorUserId: user.id,
            action: "Logged in",
            details: null,
        });
    }
    return {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
        accessToken,
        refreshToken,
    };
}
async function refreshUserSession(refreshToken) {
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    }
    catch {
        return {
            ok: false,
            code: 401,
            message: "Invalid or expired refresh token",
        };
    }
    const user = await User_model_1.User.findByPk(payload.sub);
    if (!user || !user.refreshTokenHash) {
        return {
            ok: false,
            code: 401,
            message: "Session expired",
        };
    }
    const valid = await bcryptjs_1.default.compare(refreshToken, user.refreshTokenHash);
    if (!valid) {
        return {
            ok: false,
            code: 401,
            message: "Session expired",
        };
    }
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: String(user.id),
        role: user.role.toLowerCase(),
    });
    const nextRefreshToken = (0, jwt_1.signRefreshToken)({ sub: String(user.id) });
    const refreshTokenHash = await bcryptjs_1.default.hash(nextRefreshToken, 10);
    await user.update({ refreshTokenHash });
    return {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
        accessToken,
        refreshToken: nextRefreshToken,
    };
}
async function changeUserPassword(userId, currentPassword, newPassword) {
    const user = await User_model_1.User.findByPk(userId);
    if (!user || !user.passwordHash) {
        return {
            ok: false,
            code: 404,
            message: "User not found",
        };
    }
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const valid = await bcryptjs_1.default.compare(current, user.passwordHash);
    if (!valid) {
        return {
            ok: false,
            code: 401,
            message: "Current password is incorrect",
        };
    }
    const sameAsCurrent = await bcryptjs_1.default.compare(next, user.passwordHash);
    if (sameAsCurrent) {
        return {
            ok: false,
            code: 400,
            message: "New password must be different",
        };
    }
    const passwordHash = await bcryptjs_1.default.hash(next, 10);
    await user.update({
        passwordHash,
        refreshTokenHash: null,
        passwordChangedAt: new Date(),
    });
    return { ok: true, message: "Password updated successfully" };
}
async function verifyUserPassword(userId, password) {
    const user = await User_model_1.User.findByPk(userId);
    if (!user?.passwordHash)
        return false;
    return bcryptjs_1.default.compare(password, user.passwordHash);
}
function generateSixDigitOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
async function requestStudentSignupOtp(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const availability = await ensureStudentRegistrationAvailable({
        email: normalizedEmail,
        lrn: input.lrn,
    });
    if (!availability.ok)
        return availability;
    const otp = generateSixDigitOtp();
    const otpHash = await bcryptjs_1.default.hash(otp, 10);
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await StudentSignupOtp_model_1.StudentSignupOtp.update({ usedAt: new Date() }, { where: { email: normalizedEmail, usedAt: null } });
    await StudentSignupOtp_model_1.StudentSignupOtp.create({
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
    await (0, mail_1.sendMail)({
        to: normalizedEmail,
        toName,
        subject: "EducAssist Sign Up OTP",
        html: `<p>Hello ${toName},</p><p>Your EducAssist registration OTP is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
        text: `Hello ${toName}. Your EducAssist registration OTP is ${otp}. This code expires in 10 minutes.`,
    });
    return {
        ok: true,
        message: "OTP sent to your email address.",
        email: normalizedEmail,
    };
}
async function verifyStudentSignupOtp(email, otp) {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await StudentSignupOtp_model_1.StudentSignupOtp.findOne({
        where: { email: normalizedEmail, usedAt: null },
        order: [["createdAt", "DESC"]],
    });
    if (!pending) {
        return {
            ok: false,
            code: 400,
            message: "Invalid OTP or email",
        };
    }
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
        return {
            ok: false,
            code: 400,
            message: "OTP has expired",
        };
    }
    const validOtp = await bcryptjs_1.default.compare(otp, pending.otpHash);
    if (!validOtp) {
        return {
            ok: false,
            code: 400,
            message: "Invalid OTP or email",
        };
    }
    const payload = JSON.parse(String(pending.payload));
    const result = await db_1.sequelize.transaction(async (t) => {
        const created = await createStudentAccount({
            ...payload,
            email: normalizedEmail,
            passwordHash: payload.passwordHash,
        }, t);
        if (!created.ok)
            return created;
        await pending.update({ usedAt: new Date() }, { transaction: t });
        return created;
    });
    return result;
}
async function requestStudentPasswordResetOtp(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User_model_1.User.findOne({ where: { email: normalizedEmail } });
    // Do not reveal whether the account exists.
    if (!user || String(user.role).toUpperCase() !== "STUDENT") {
        return {
            ok: true,
            message: "If the email exists, an OTP has been sent.",
        };
    }
    const otp = generateSixDigitOtp();
    const otpHash = await bcryptjs_1.default.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await PasswordResetOtp_model_1.PasswordResetOtp.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
    await PasswordResetOtp_model_1.PasswordResetOtp.create({
        userId: user.id,
        otpHash,
        expiresAt,
        verifiedAt: null,
        usedAt: null,
    });
    let toName = "Student";
    const student = await Student_model_1.Student.findOne({ where: { userId: user.id } });
    if (student) {
        toName =
            `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
                "Student";
    }
    await (0, mail_1.sendMail)({
        to: user.email,
        toName,
        subject: "EducAssist Password Reset OTP",
        html: `<p>Hello ${toName},</p><p>Your EducAssist OTP is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
        text: `Hello ${toName}. Your EducAssist OTP is ${otp}. This code expires in 10 minutes.`,
    });
    return {
        ok: true,
        message: "If the email exists, an OTP has been sent.",
    };
}
async function verifyStudentPasswordResetOtp(email, otp) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User_model_1.User.findOne({ where: { email: normalizedEmail } });
    if (!user || String(user.role).toUpperCase() !== "STUDENT") {
        return {
            ok: false,
            code: 400,
            message: "Invalid OTP or email",
        };
    }
    const latestOtp = await PasswordResetOtp_model_1.PasswordResetOtp.findOne({
        where: { userId: user.id, usedAt: null },
        order: [["createdAt", "DESC"]],
    });
    if (!latestOtp) {
        return {
            ok: false,
            code: 400,
            message: "Invalid OTP or email",
        };
    }
    if (new Date(latestOtp.expiresAt).getTime() < Date.now()) {
        return {
            ok: false,
            code: 400,
            message: "OTP has expired",
        };
    }
    const validOtp = await bcryptjs_1.default.compare(otp, latestOtp.otpHash);
    if (!validOtp) {
        return {
            ok: false,
            code: 400,
            message: "Invalid OTP or email",
        };
    }
    await latestOtp.update({ verifiedAt: new Date() });
    return {
        ok: true,
        message: "OTP verified. You can now reset your password.",
    };
}
async function resetStudentPasswordWithOtp(email, newPassword) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User_model_1.User.findOne({ where: { email: normalizedEmail } });
    if (!user || String(user.role).toUpperCase() !== "STUDENT") {
        return {
            ok: false,
            code: 400,
            message: "Reset session is invalid",
        };
    }
    const latestOtp = await PasswordResetOtp_model_1.PasswordResetOtp.findOne({
        where: { userId: user.id, usedAt: null },
        order: [["createdAt", "DESC"]],
    });
    if (!latestOtp) {
        return {
            ok: false,
            code: 400,
            message: "Reset session is invalid",
        };
    }
    if (new Date(latestOtp.expiresAt).getTime() < Date.now()) {
        return {
            ok: false,
            code: 400,
            message: "OTP has expired",
        };
    }
    if (!latestOtp.verifiedAt) {
        return {
            ok: false,
            code: 400,
            message: "Verify OTP first",
        };
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await user.update({ passwordHash, refreshTokenHash: null });
    await latestOtp.update({ usedAt: new Date() });
    return {
        ok: true,
        message: "Password reset successful. You can now log in.",
    };
}
