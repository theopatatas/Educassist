import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  lrn: z.string().min(4),
  yearLevel: z.string().min(1),
  middleName: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  guardianName: z.string().min(1),
  guardianContact: z.string().min(5),
  sectionId: z.number().optional(),
  sectionName: z.string().min(1).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(5),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const requestPasswordResetOtpSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
});

export const verifyPasswordResetOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const requestStudentSignupOtpSchema = registerSchema;

export const verifyStudentSignupOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type RequestPasswordResetOtpInput = z.infer<typeof requestPasswordResetOtpSchema>;
export type ResetPasswordWithOtpInput = z.infer<typeof resetPasswordWithOtpSchema>;
export type VerifyPasswordResetOtpInput = z.infer<typeof verifyPasswordResetOtpSchema>;
export type RequestStudentSignupOtpInput = z.infer<typeof requestStudentSignupOtpSchema>;
export type VerifyStudentSignupOtpInput = z.infer<typeof verifyStudentSignupOtpSchema>;
