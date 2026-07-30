"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.getCurrentAcademicContext = getCurrentAcademicContext;
exports.updateSettingsSection = updateSettingsSection;
exports.updateGradeEncodingStatus = updateGradeEncodingStatus;
exports.gradeSubmissionProgress = gradeSubmissionProgress;
exports.academicAuditLogs = academicAuditLogs;
exports.unlockPublishedGrades = unlockPublishedGrades;
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
        const submittedTerm = String(value.currentTerm ?? value["currentQuarter"] ?? "").trim();
        if (!text("currentSchoolYear") || !submittedTerm)
            return "School year and term are required";
        if (!["Term 1", "Term 2", "Term 3", "End of School Year"].includes(submittedTerm
            .replace(/^Quarter 1$/i, "Term 1")
            .replace(/^Quarter 2$/i, "Term 2")
            .replace(/^Quarter [34]$/i, "Term 3")))
            return "Academic period must be Term 1, Term 2, Term 3, or End of School Year";
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
async function getCurrentAcademicContext(_req, res) {
    return res.json({ ok: true, academic: await (0, settings_service_1.getAcademicContext)() });
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
    const id = userId(req);
    const mutationContext = id
        ? {
            userId: id,
            role: String(req.user?.role ?? "super_admin"),
            ipAddress: req.ip,
            deviceInfo: req.get("user-agent") ?? null,
        }
        : null;
    let settings;
    if (section === "academic" && mutationContext) {
        settings = await (0, settings_service_1.saveAcademicSettings)(req.body, mutationContext);
    }
    else {
        settings = await (0, settings_service_1.savePlatformSettingsSection)(section, req.body, id);
        if (section === "general" && mutationContext) {
            const platform = await (0, settings_service_1.getPlatformSettings)();
            if (platform.academic &&
                String(platform.academic.currentSchoolYear ?? "") !==
                    String(req.body.currentAcademicYear ?? "")) {
                await (0, settings_service_1.saveAcademicSettings)({
                    ...platform.academic,
                    currentSchoolYear: req.body.currentAcademicYear,
                }, mutationContext);
            }
        }
    }
    return res.json({ ok: true, settings });
}
async function updateGradeEncodingStatus(req, res) {
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
    const settings = await (0, settings_service_1.setGradeEncodingStatus)(status, {
        userId: id,
        role: String(req.user?.role ?? "super_admin"),
        ipAddress: req.ip,
        deviceInfo: req.get("user-agent") ?? null,
    }, deadline);
    if (!settings)
        return res
            .status(404)
            .json({ ok: false, message: "Academic settings are unavailable" });
    return res.json({ ok: true, settings });
}
async function gradeSubmissionProgress(_req, res) {
    return res.json({
        ok: true,
        progress: await (0, settings_service_1.getGradeSubmissionProgress)(),
    });
}
async function academicAuditLogs(_req, res) {
    return res.json({ ok: true, audits: await (0, settings_service_1.listAcademicAuditLogs)() });
}
async function unlockPublishedGrades(req, res) {
    const id = userId(req);
    const gradeItemId = Number(req.params.gradeItemId);
    if (!id || !Number.isInteger(gradeItemId) || gradeItemId <= 0) {
        return res
            .status(400)
            .json({ ok: false, message: "A valid grade item is required" });
    }
    const result = await (0, settings_service_1.unlockPublishedGradeItem)(gradeItemId, {
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
