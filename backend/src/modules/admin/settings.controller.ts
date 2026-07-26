import type { Request, Response } from "express";
import {
  clearLogo,
  editableSections,
  getAcademicContext,
  getGradeSubmissionProgress,
  getPlatformSettings,
  listAcademicAuditLogs,
  saveAcademicSettings,
  saveLogo,
  savePlatformSettingsSection,
  setGradeEncodingStatus,
  unlockPublishedGradeItem,
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
    if (!text("currentSchoolYear") || !text("currentQuarter"))
      return "School year and quarter are required";
    if (
      ![
        "Quarter 1",
        "Quarter 2",
        "Quarter 3",
        "Quarter 4",
        "End of School Year",
      ].includes(
        text("currentQuarter"),
      )
    )
      return "Academic period must be Quarter 1, Quarter 2, Quarter 3, Quarter 4, or End of School Year";
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

export async function getCurrentAcademicContext(_req: Request, res: Response) {
  return res.json({ ok: true, academic: await getAcademicContext() });
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
  const id = userId(req);
  const mutationContext =
    id
      ? {
          userId: id,
          role: String(req.user?.role ?? "super_admin"),
          ipAddress: req.ip,
          deviceInfo: req.get("user-agent") ?? null,
        }
      : null;
  let settings;
  if (section === "academic" && mutationContext) {
    settings = await saveAcademicSettings(req.body, mutationContext);
  } else {
    settings = await savePlatformSettingsSection(section, req.body, id);
    if (section === "general" && mutationContext) {
      const platform = await getPlatformSettings();
      if (
        platform.academic &&
        String(platform.academic.currentSchoolYear ?? "") !==
          String(req.body.currentAcademicYear ?? "")
      ) {
        await saveAcademicSettings(
          {
            ...platform.academic,
            currentSchoolYear: req.body.currentAcademicYear,
          },
          mutationContext,
        );
      }
    }
  }
  return res.json({ ok: true, settings });
}

export async function updateGradeEncodingStatus(
  req: Request,
  res: Response,
) {
  const id = userId(req);
  const status = String(req.body?.status ?? "").toUpperCase();
  const deadline = String(req.body?.deadline ?? "").trim() || undefined;
  if (!id || !["OPEN", "LOCKED"].includes(status)) {
    return res
      .status(400)
      .json({ ok: false, message: "A valid encoding status is required" });
  }
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return res
      .status(400)
      .json({ ok: false, message: "Deadline must be a valid date" });
  }
  const settings = await setGradeEncodingStatus(
    status as "OPEN" | "LOCKED",
    {
      userId: id,
      role: String(req.user?.role ?? "super_admin"),
      ipAddress: req.ip,
      deviceInfo: req.get("user-agent") ?? null,
    },
    deadline,
  );
  if (!settings)
    return res
      .status(404)
      .json({ ok: false, message: "Academic settings are unavailable" });
  return res.json({ ok: true, settings });
}

export async function gradeSubmissionProgress(_req: Request, res: Response) {
  return res.json({
    ok: true,
    progress: await getGradeSubmissionProgress(),
  });
}

export async function academicAuditLogs(_req: Request, res: Response) {
  return res.json({ ok: true, audits: await listAcademicAuditLogs() });
}

export async function unlockPublishedGrades(req: Request, res: Response) {
  const id = userId(req);
  const gradeItemId = Number(req.params.gradeItemId);
  if (!id || !Number.isInteger(gradeItemId) || gradeItemId <= 0) {
    return res
      .status(400)
      .json({ ok: false, message: "A valid grade item is required" });
  }
  const result = await unlockPublishedGradeItem(gradeItemId, {
    userId: id,
    role: String(req.user?.role ?? "super_admin"),
    ipAddress: req.ip,
    deviceInfo: req.get("user-agent") ?? null,
  });
  if (result === null)
    return res
      .status(404)
      .json({ ok: false, message: "Grade item not found" });
  if (result === false)
    return res
      .status(409)
      .json({ ok: false, message: "Grades are already unlocked" });
  return res.json({ ok: true, gradeItem: result });
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
