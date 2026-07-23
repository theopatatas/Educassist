import type { Request, Response } from "express";
import {
  clearLogo,
  editableSections,
  getPlatformSettings,
  saveLogo,
  savePlatformSettingsSection,
  type EditableSection,
} from "./settings.service";
import { removeStoredLogo, schoolLogoUrl } from "./settings.upload";

function userId(req: Request) {
  const value = (req as Request & { user?: { sub?: string } }).user?.sub;
  return value ? Number(value) : undefined;
}

function validateSection(
  section: EditableSection,
  value: Record<string, unknown>,
) {
  const text = (key: string) => String(value[key] ?? "").trim();
  if (section === "general") {
    if (
      !text("schoolName") ||
      !text("schoolAddress") ||
      !text("timeZone") ||
      !text("currentAcademicYear")
    ) {
      return "School name, address, time zone, and academic year are required";
    }
    if (!/^09\d{9}$/.test(text("schoolContactNumber")))
      return "School contact number must contain 11 digits beginning with 09";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("schoolEmail")))
      return "A valid school email is required";
  }
  if (section === "academic") {
    if (
      !text("currentSchoolYear") ||
      !text("currentSemester") ||
      !text("currentQuarter")
    )
      return "School year, semester, and quarter are required";
    const passingGrade = Number(value.passingGrade);
    if (
      !Number.isFinite(passingGrade) ||
      passingGrade < 0 ||
      passingGrade > 100
    )
      return "Passing grade must be between 0 and 100";
  }
  if (section === "security") {
    for (const key of [
      "minimumPasswordLength",
      "sessionTimeout",
      "maximumLoginAttempts",
      "accountLockDuration",
    ]) {
      if (!Number.isFinite(Number(value[key])) || Number(value[key]) <= 0)
        return "Security numeric values must be greater than zero";
    }
  }
  return null;
}

export async function getSettings(_req: Request, res: Response) {
  return res.json({ ok: true, settings: await getPlatformSettings() });
}

export async function updateSettingsSection(req: Request, res: Response) {
  const section = req.params.section as EditableSection;
  if (!editableSections.includes(section)) {
    return res
      .status(400)
      .json({ ok: false, message: "Unsupported settings section" });
  }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid settings payload" });
  }
  const validationError = validateSection(section, req.body);
  if (validationError)
    return res.status(400).json({ ok: false, message: validationError });
  const settings = await savePlatformSettingsSection(
    section,
    req.body,
    userId(req),
  );
  return res.json({ ok: true, settings });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file)
    return res
      .status(400)
      .json({ ok: false, message: "School logo is required" });
  const result = await saveLogo(schoolLogoUrl(req.file.filename), userId(req));
  removeStoredLogo(result.previous);
  return res.status(201).json({ ok: true, logoUrl: result.logoUrl });
}

export async function deleteLogo(req: Request, res: Response) {
  const previous = await clearLogo(userId(req));
  removeStoredLogo(previous);
  return res.json({ ok: true });
}
