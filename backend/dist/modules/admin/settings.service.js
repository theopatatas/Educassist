"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editableSections = void 0;
exports.getPlatformSettings = getPlatformSettings;
exports.savePlatformSettingsSection = savePlatformSettingsSection;
exports.saveLogo = saveLogo;
exports.clearLogo = clearLogo;
const PlatformSetting_model_1 = require("../../db/models/PlatformSetting.model");
exports.editableSections = [
    "general",
    "academic",
    "userManagement",
    "security",
    "notifications",
    "appearance",
];
async function findSettings() {
    return PlatformSetting_model_1.PlatformSetting.findByPk(1);
}
async function getPlatformSettings() {
    const row = await findSettings();
    return serializeSettings(row);
}
async function savePlatformSettingsSection(section, value, updatedBy) {
    const [row] = await PlatformSetting_model_1.PlatformSetting.findOrCreate({
        where: { id: 1 },
        defaults: { id: 1 },
    });
    await row.update({ [section]: value, updatedBy: updatedBy ?? null });
    return (row.get(section) ?? null);
}
async function saveLogo(url, updatedBy) {
    const [row] = await PlatformSetting_model_1.PlatformSetting.findOrCreate({
        where: { id: 1 },
        defaults: { id: 1 },
    });
    const previous = row.logoUrl;
    await row.update({ logoUrl: url, updatedBy: updatedBy ?? null });
    return { previous, logoUrl: row.logoUrl };
}
async function clearLogo(updatedBy) {
    const row = await findSettings();
    if (!row)
        return null;
    const previous = row.logoUrl;
    await row.update({ logoUrl: null, updatedBy: updatedBy ?? null });
    return previous;
}
function serializeSettings(row) {
    return {
        general: row?.general ?? null,
        academic: row?.academic ?? null,
        userManagement: row?.userManagement ?? null,
        security: row?.security ?? null,
        notifications: row?.notifications ?? null,
        appearance: row?.appearance ?? null,
        branding: { logoUrl: row?.logoUrl ?? null },
        systemInformation: {
            lmsVersion: process.env.npm_package_version || null,
            buildVersion: process.env.BUILD_VERSION || null,
            apiVersion: process.env.API_VERSION || null,
            environment: process.env.NODE_ENV || null,
            lastUpdated: row?.getDataValue("updatedAt") ?? null,
        },
    };
}
