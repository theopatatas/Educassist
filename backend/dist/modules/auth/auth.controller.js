"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.requestRegisterOtp = requestRegisterOtp;
exports.verifyRegisterOtp = verifyRegisterOtp;
exports.login = login;
exports.refreshSession = refreshSession;
exports.changePassword = changePassword;
exports.verifyPassword = verifyPassword;
exports.requestPasswordResetOtp = requestPasswordResetOtp;
exports.verifyPasswordResetOtp = verifyPasswordResetOtp;
exports.resetPasswordWithOtp = resetPasswordWithOtp;
const auth_schemas_1 = require("./auth.schemas");
const auth_service_1 = require("./auth.service");
const errors_1 = require("../../utils/errors");
async function register(req, res) {
    const input = auth_schemas_1.registerSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    try {
        const result = await (0, auth_service_1.registerUser)(input.data);
        if (!result.ok) {
            return res.status(result.code).json({ ok: false, message: result.message });
        }
        return res.status(201).json(result);
    }
    catch (err) {
        if ((0, errors_1.hasErrorName)(err, "SequelizeUniqueConstraintError")) {
            const fields = (0, errors_1.getErrorFieldNames)(err);
            if (fields.includes("email")) {
                return res.status(409).json({ ok: false, message: "Email already in use" });
            }
            if (fields.includes("lrn")) {
                return res.status(409).json({ ok: false, message: "LRN already in use" });
            }
            return res.status(409).json({ ok: false, message: "Duplicate data already exists" });
        }
        if ((0, errors_1.hasErrorName)(err, "SequelizeForeignKeyConstraintError")) {
            return res.status(400).json({ ok: false, message: "Invalid related data (check Section)." });
        }
        throw err;
    }
}
async function requestRegisterOtp(req, res) {
    const input = auth_schemas_1.requestStudentSignupOtpSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    try {
        const result = await (0, auth_service_1.requestStudentSignupOtp)(input.data);
        if (!result.ok) {
            return res.status(result.code).json({ ok: false, message: result.message });
        }
        return res.json(result);
    }
    catch {
        return res.status(500).json({ ok: false, message: "Failed to send OTP" });
    }
}
async function verifyRegisterOtp(req, res) {
    const input = auth_schemas_1.verifyStudentSignupOtpSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.verifyStudentSignupOtp)(input.data.email, input.data.otp);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.status(201).json(result);
}
async function login(req, res) {
    const input = auth_schemas_1.loginSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.loginUser)(input.data.email, input.data.password);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
}
async function refreshSession(req, res) {
    const input = auth_schemas_1.refreshTokenSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.refreshUserSession)(input.data.refreshToken);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
}
async function changePassword(req, res) {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
    const input = auth_schemas_1.changePasswordSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.changeUserPassword)(userId, input.data.currentPassword, input.data.newPassword);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json({ ok: true, message: result.message });
}
async function verifyPassword(req, res) {
    const userId = req.user?.sub;
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (!password)
        return res.status(400).json({ ok: false, message: "Password is required" });
    const valid = await (0, auth_service_1.verifyUserPassword)(userId, password);
    if (!valid)
        return res.status(401).json({ ok: false, message: "Incorrect password" });
    return res.json({ ok: true });
}
async function requestPasswordResetOtp(req, res) {
    const input = auth_schemas_1.requestPasswordResetOtpSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    try {
        const result = await (0, auth_service_1.requestStudentPasswordResetOtp)(input.data.email);
        return res.json(result);
    }
    catch {
        return res.status(500).json({ ok: false, message: "Failed to send OTP" });
    }
}
async function verifyPasswordResetOtp(req, res) {
    const input = auth_schemas_1.verifyPasswordResetOtpSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.verifyStudentPasswordResetOtp)(input.data.email, input.data.otp);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json({ ok: true, message: result.message });
}
async function resetPasswordWithOtp(req, res) {
    const input = auth_schemas_1.resetPasswordWithOtpSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.resetStudentPasswordWithOtp)(input.data.email, input.data.newPassword);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json({ ok: true, message: result.message });
}
