"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyStudentSignupOtpSchema = exports.requestStudentSignupOtpSchema = exports.verifyPasswordResetOtpSchema = exports.resetPasswordWithOtpSchema = exports.requestPasswordResetOtpSchema = exports.refreshTokenSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    lrn: zod_1.z.string().min(4),
    yearLevel: zod_1.z.string().min(1),
    middleName: zod_1.z.string().optional().nullable(),
    birthDate: zod_1.z.string().optional().nullable(),
    gender: zod_1.z.string().optional().nullable(),
    guardianName: zod_1.z.string().min(1),
    guardianContact: zod_1.z.string().min(5),
    sectionId: zod_1.z.number().optional(),
    sectionName: zod_1.z.string().min(1).optional().nullable(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(1),
    password: zod_1.z.string().min(5),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.requestPasswordResetOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordWithOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    newPassword: zod_1.z.string().min(8),
});
exports.verifyPasswordResetOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
exports.requestStudentSignupOtpSchema = exports.registerSchema;
exports.verifyStudentSignupOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
