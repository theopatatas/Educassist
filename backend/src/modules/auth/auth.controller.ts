import type { Request, Response } from "express";
import { changePasswordSchema, loginSchema, registerSchema } from "./auth.schemas";
import { changeUserPassword, loginUser, registerUser } from "./auth.service";

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
  } catch (err: any) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      const fields = Object.keys(err?.fields ?? {});
      if (fields.includes("email")) {
        return res.status(409).json({ ok: false, message: "Email already in use" });
      }
      if (fields.includes("lrn")) {
        return res.status(409).json({ ok: false, message: "LRN already in use" });
      }
      return res.status(409).json({ ok: false, message: "Duplicate data already exists" });
    }
    if (err?.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({ ok: false, message: "Invalid related data (check Section)." });
    }
    throw err;
  }
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

export async function changePassword(req: Request, res: Response) {
  const userId = (req as any).user?.sub as string | undefined;
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
