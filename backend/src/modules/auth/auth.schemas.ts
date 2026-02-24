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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
