"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettingsSection = updateSettingsSection;
exports.uploadLogo = uploadLogo;
exports.deleteLogo = deleteLogo;
const settings_service_1 = require("./settings.service");
const settings_upload_1 = require("./settings.upload");
function userId(req) {
    const value = req.user?.sub;
    return value ? Number(value) : undefined;
}
function validateSection(section, value) {
    const text = (key) => String(value[key] ?? "").trim();
    if (section === "general") {
        if (!text("schoolName") ||
            !text("schoolAddress") ||
            !text("timeZone") ||
            !text("currentAcademicYear")) {
            return "School name, address, time zone, and academic year are required";
        }
        if (!/^09\d{9}$/.test(text("schoolContactNumber")))
            return "School contact number must contain 11 digits beginning with 09";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("schoolEmail")))
            return "A valid school email is required";
    }
    if (section === "academic") {
        if (!text("currentSchoolYear") ||
            !text("currentSemester") ||
            !text("currentQuarter"))
            return "School year, semester, and quarter are required";
        const passingGrade = Number(value.passingGrade);
        if (!Number.isFinite(passingGrade) ||
            passingGrade < 0 ||
            passingGrade > 100)
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
async function getSettings(_req, res) {
    return res.json({ ok: true, settings: await (0, settings_service_1.getPlatformSettings)() });
}
async function updateSettingsSection(req, res) {
    const section = req.params.section;
    if (!settings_service_1.editableSections.includes(section)) {
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
    const settings = await (0, settings_service_1.savePlatformSettingsSection)(section, req.body, userId(req));
    return res.json({ ok: true, settings });
}
async function uploadLogo(req, res) {
    if (!req.file)
        return res
            .status(400)
            .json({ ok: false, message: "School logo is required" });
    const result = await (0, settings_service_1.saveLogo)((0, settings_upload_1.schoolLogoUrl)(req.file.filename), userId(req));
    (0, settings_upload_1.removeStoredLogo)(result.previous);
    return res.status(201).json({ ok: true, logoUrl: result.logoUrl });
}
async function deleteLogo(req, res) {
    const previous = await (0, settings_service_1.clearLogo)(userId(req));
    (0, settings_upload_1.removeStoredLogo)(previous);
    return res.json({ ok: true });
}
