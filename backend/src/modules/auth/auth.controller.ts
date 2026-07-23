import type { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestStudentSignupOtpSchema,
  requestPasswordResetOtpSchema,
  resetPasswordWithOtpSchema,
  verifyPasswordResetOtpSchema,
  verifyStudentSignupOtpSchema,
} from "./auth.schemas";
import {
  changeUserPassword,
  loginUser,
  refreshUserSession,
  registerUser,
  requestStudentSignupOtp,
  requestStudentPasswordResetOtp,
  resetStudentPasswordWithOtp,
  verifyStudentPasswordResetOtp,
  verifyStudentSignupOtp,
  verifyUserPassword,
} from "./auth.service";
import { getErrorFieldNames, hasErrorName } from "../../utils/errors";

export async function register(req: Request, res: Response) {
  const input = registerSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  try {
    const result = await registerUser(input.data);
    if (!result.ok) {
      return res.status(result.code).json({ ok: false, message: result.message });
    }

    return res.status(201).json(result);
  } catch (err: unknown) {
    if (hasErrorName(err, "SequelizeUniqueConstraintError")) {
      const fields = getErrorFieldNames(err);
      if (fields.includes("email")) {
        return res.status(409).json({ ok: false, message: "Email already in use" });
      }
      if (fields.includes("lrn")) {
        return res.status(409).json({ ok: false, message: "LRN already in use" });
      }
      return res.status(409).json({ ok: false, message: "Duplicate data already exists" });
    }
    if (hasErrorName(err, "SequelizeForeignKeyConstraintError")) {
      return res.status(400).json({ ok: false, message: "Invalid related data (check Section)." });
    }
    throw err;
  }
}

export async function requestRegisterOtp(req: Request, res: Response) {
  const input = requestStudentSignupOtpSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  try {
    const result = await requestStudentSignupOtp(input.data);
    if (!result.ok) {
      return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to send OTP" });
  }
}

export async function verifyRegisterOtp(req: Request, res: Response) {
  const input = verifyStudentSignupOtpSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await verifyStudentSignupOtp(input.data.email, input.data.otp);
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }
  return res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await loginUser(input.data.email, input.data.password);
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }

  return res.json(result);
}

export async function refreshSession(req: Request, res: Response) {
  const input = refreshTokenSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await refreshUserSession(input.data.refreshToken);
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }

  return res.json(result);
}

export async function changePassword(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const input = changePasswordSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await changeUserPassword(
    userId,
    input.data.currentPassword,
    input.data.newPassword
  );
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }

  return res.json({ ok: true, message: result.message });
}

export async function verifyPassword(req: Request, res: Response) {
  const userId = req.user?.sub;
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  if (!password) return res.status(400).json({ ok: false, message: "Password is required" });
  const valid = await verifyUserPassword(userId, password);
  if (!valid) return res.status(401).json({ ok: false, message: "Incorrect password" });
  return res.json({ ok: true });
}

export async function requestPasswordResetOtp(req: Request, res: Response) {
  const input = requestPasswordResetOtpSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  try {
    const result = await requestStudentPasswordResetOtp(input.data.email);
    return res.json(result);
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to send OTP" });
  }
}

export async function verifyPasswordResetOtp(req: Request, res: Response) {
  const input = verifyPasswordResetOtpSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await verifyStudentPasswordResetOtp(input.data.email, input.data.otp);
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }

  return res.json({ ok: true, message: result.message });
}

export async function resetPasswordWithOtp(req: Request, res: Response) {
  const input = resetPasswordWithOtpSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
  }

  const result = await resetStudentPasswordWithOtp(input.data.email, input.data.newPassword);
  if (!result.ok) {
    return res.status(result.code).json({ ok: false, message: result.message });
  }

  return res.json({ ok: true, message: result.message });
}
