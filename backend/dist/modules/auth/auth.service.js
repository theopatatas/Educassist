"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.changeUserPassword = changeUserPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const User_model_1 = require("../../db/models/User.model");
const jwt_1 = require("../../utils/jwt");
async function registerUser(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    return db_1.sequelize.transaction(async (t) => {
        const existing = await User_model_1.User.findOne({ where: { email: normalizedEmail }, transaction: t });
        if (existing) {
            return { ok: false, code: 409, message: "Email already in use" };
        }
        const existingStudentLrn = await Student_model_1.Student.findOne({ where: { lrn: input.lrn }, transaction: t });
        if (existingStudentLrn) {
            return { ok: false, code: 409, message: "LRN already in use" };
        }
        const existingUserLrn = await User_model_1.User.findOne({ where: { lrn: input.lrn }, transaction: t });
        if (existingUserLrn) {
            return { ok: false, code: 409, message: "LRN already in use" };
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await User_model_1.User.create({
            email: normalizedEmail,
            passwordHash,
            role: "STUDENT",
            lrn: input.lrn,
            refreshTokenHash: null,
        }, { transaction: t });
        let resolvedSectionId = null;
        if (typeof input.sectionId === "number" && Number.isFinite(input.sectionId)) {
            const section = await Section_model_1.Section.findByPk(input.sectionId, { transaction: t });
            resolvedSectionId = section ? Number(section.id) : null;
        }
        if (!resolvedSectionId && input.sectionName?.trim()) {
            const normalized = input.sectionName.trim();
            const [section] = await Section_model_1.Section.findOrCreate({
                where: { name: normalized },
                defaults: { name: normalized },
                transaction: t,
            });
            resolvedSectionId = Number(section.id);
        }
        await Student_model_1.Student.create({
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
        }, { transaction: t });
        const accessToken = (0, jwt_1.signAccessToken)({ sub: String(user.id), role: user.role.toLowerCase() });
        const refreshToken = (0, jwt_1.signRefreshToken)({ sub: String(user.id) });
        const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, 10);
        await user.update({ refreshTokenHash }, { transaction: t });
        return {
            ok: true,
            user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
            accessToken,
            refreshToken,
        };
    });
}
async function loginUser(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User_model_1.User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        return { ok: false, code: 401, message: "Invalid credentials" };
    }
    if (!user.passwordHash) {
        return { ok: false, code: 401, message: "Invalid credentials" };
    }
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        return { ok: false, code: 401, message: "Invalid credentials" };
    }
    const accessToken = (0, jwt_1.signAccessToken)({ sub: String(user.id), role: user.role.toLowerCase() });
    const refreshToken = (0, jwt_1.signRefreshToken)({ sub: String(user.id) });
    const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, 10);
    await user.update({ refreshTokenHash });
    return {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
        accessToken,
        refreshToken,
    };
}
async function changeUserPassword(userId, currentPassword, newPassword) {
    const user = await User_model_1.User.findByPk(userId);
    if (!user || !user.passwordHash) {
        return { ok: false, code: 404, message: "User not found" };
    }
    const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!valid) {
        return { ok: false, code: 401, message: "Current password is incorrect" };
    }
    const sameAsCurrent = await bcryptjs_1.default.compare(newPassword, user.passwordHash);
    if (sameAsCurrent) {
        return { ok: false, code: 400, message: "New password must be different" };
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await user.update({ passwordHash });
    return { ok: true, message: "Password updated successfully" };
}
