import type { Request, Response } from "express";
import {
  createAdminUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
  setUserProfilePhoto,
  getAdminActivities,
  recordAdminActivity,
} from "./users.service";
import { profilePhotoUrl, removeProfilePhoto } from "./users.upload";
import { verifyUserPassword } from "../auth/auth.service";

function currentUserId(req: Request) {
  return String((req as Request & { user?: { sub?: string } }).user?.sub ?? "");
}

async function requireSuperAdminPassword(req: Request, res: Response) {
  const password = String(req.body?.superAdminPassword ?? "");
  if (!password || !(await verifyUserPassword(currentUserId(req), password))) {
    res.status(403).json({
      ok: false,
      message: "The Super Admin password is incorrect",
    });
    return false;
  }
  return true;
}

export async function getMe(req: Request, res: Response) {
  const user = await getUserById(currentUserId(req));
  if (!user)
    return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
}

export async function updateMe(req: Request, res: Response) {
  const firstName = String(req.body?.firstName ?? "").trim();
  const middleName = String(req.body?.middleName ?? "").trim();
  const lastName = String(req.body?.lastName ?? "").trim();
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const mobileNumber = String(req.body?.mobileNumber ?? "").trim();
  const displayName = String(req.body?.displayName ?? "").trim();
  const namePattern = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
  if (
    !namePattern.test(firstName) ||
    !namePattern.test(lastName) ||
    (middleName && !namePattern.test(middleName))
  )
    return res.status(400).json({
      ok: false,
      message: "Names must start with capital letters and contain letters only",
    });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res
      .status(400)
      .json({ ok: false, message: "A valid email is required" });
  if (!/^09\d{9}$/.test(mobileNumber))
    return res.status(400).json({
      ok: false,
      message: "Mobile number must contain 11 digits beginning with 09",
    });
  if (!displayName || displayName.length > 150)
    return res.status(400).json({
      ok: false,
      message: "Display name is required and must not exceed 150 characters",
    });
  try {
    const user = await updateUser(currentUserId(req), {
      firstName,
      middleName: middleName || null,
      lastName,
      displayName,
      email,
      mobileNumber,
    });
    return res.json({ ok: true, user });
  } catch (error: unknown) {
    if ((error as { name?: string }).name === "SequelizeUniqueConstraintError")
      return res
        .status(409)
        .json({ ok: false, message: "Email is already in use" });
    throw error;
  }
}

export async function uploadMyProfilePhoto(req: Request, res: Response) {
  if (!req.file)
    return res
      .status(400)
      .json({ ok: false, message: "Profile picture is required" });
  const result = await setUserProfilePhoto(
    currentUserId(req),
    profilePhotoUrl(req.file.filename),
  );
  if (!result)
    return res.status(404).json({ ok: false, message: "User not found" });
  removeProfilePhoto(result.previous);
  return res.status(201).json({ ok: true, user: result.user });
}

export async function deleteMyProfilePhoto(req: Request, res: Response) {
  const result = await setUserProfilePhoto(currentUserId(req), null);
  if (!result)
    return res.status(404).json({ ok: false, message: "User not found" });
  removeProfilePhoto(result.previous);
  return res.json({ ok: true, user: result.user });
}

export async function create(req: Request, res: Response) {
  if (!(await requireSuperAdminPassword(req, res))) return;
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  const firstName = String(req.body?.firstName ?? "").trim();
  const middleName = String(req.body?.middleName ?? "").trim();
  const lastName = String(req.body?.lastName ?? "").trim();
  const mobileNumber = String(req.body?.mobileNumber ?? "").trim();
  const validName = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
  if (!validName.test(firstName) || !validName.test(lastName)) {
    return res.status(400).json({
      ok: false,
      message:
        "First and last names must start with capital letters and contain letters only",
    });
  }
  if (middleName && !validName.test(middleName)) {
    return res.status(400).json({
      ok: false,
      message:
        "Middle name must start with a capital letter and contain letters only",
    });
  }
  if (!/^09\d{9}$/.test(mobileNumber)) {
    return res.status(400).json({
      ok: false,
      message: "Mobile number must contain 11 digits and start with 09",
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ ok: false, message: "A valid email address is required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      message: "Password must contain at least 8 characters",
    });
  }
  const result = await createAdminUser({
    email,
    password,
    firstName,
    middleName: middleName || null,
    lastName,
    mobileNumber,
    createdById: Number(currentUserId(req)),
  });
  if (!result.ok) return res.status(result.code).json(result);
  return res.status(201).json({ ok: true, user: result.user });
}

export async function list(req: Request, res: Response) {
  const users = await listUsers();
  return res.json({ ok: true, users });
}

export async function getById(req: Request, res: Response) {
  const user = await getUserById(req.params.id);
  if (!user)
    return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
}

export async function activities(req: Request, res: Response) {
  const records = await getAdminActivities(req.params.id);
  return res.json({ ok: true, activities: records });
}

export async function update(req: Request, res: Response) {
  if (!(await requireSuperAdminPassword(req, res))) return;
  try {
    const firstName = req.body?.firstName;
    const middleName = req.body?.middleName;
    const lastName = req.body?.lastName;
    const mobileNumber = req.body?.mobileNumber;
    const validName = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
    if (
      (firstName !== undefined && !validName.test(String(firstName))) ||
      (lastName !== undefined && !validName.test(String(lastName))) ||
      (middleName && !validName.test(String(middleName)))
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "Names must start with capital letters and contain letters only",
      });
    }
    if (mobileNumber !== undefined && !/^09\d{9}$/.test(String(mobileNumber))) {
      return res.status(400).json({
        ok: false,
        message: "Mobile number must contain 11 digits beginning with 09",
      });
    }
    const updates = { ...(req.body ?? {}) };
    delete updates.superAdminPassword;
    const user = await updateUser(req.params.id, updates);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });
    const changed = Object.keys(updates).join(", ");
    await recordAdminActivity(
      req.params.id,
      currentUserId(req),
      "Account updated",
      changed ? `Updated: ${changed}` : undefined,
    );
    return res.json({ ok: true, user });
  } catch (error: unknown) {
    if (
      (error as { name?: string }).name === "SequelizeUniqueConstraintError"
    ) {
      return res
        .status(409)
        .json({ ok: false, message: "Email is already in use" });
    }
    throw error;
  }
}

export async function remove(req: Request, res: Response) {
  if (!(await requireSuperAdminPassword(req, res))) return;
  const currentUserId = (req as Request & { user?: { sub?: string } }).user
    ?.sub;
  if (String(currentUserId) === String(req.params.id)) {
    return res.status(400).json({
      ok: false,
      message: "You cannot delete your own Super Admin account",
    });
  }
  const ok = await deleteUser(req.params.id);
  if (!ok)
    return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true });
}
