import { PlatformSetting } from "../../db/models/PlatformSetting.model";

export const editableSections = [
  "general",
  "academic",
  "userManagement",
  "security",
  "notifications",
  "appearance",
] as const;
export type EditableSection = (typeof editableSections)[number];

async function findSettings() {
  return PlatformSetting.findByPk(1);
}

export async function getPlatformSettings() {
  const row = await findSettings();
  return serializeSettings(row);
}

export async function savePlatformSettingsSection(
  section: EditableSection,
  value: Record<string, unknown>,
  updatedBy?: number,
) {
  const [row] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  await row.update({ [section]: value, updatedBy: updatedBy ?? null });
  return (row.get(section) ?? null) as Record<string, unknown> | null;
}

export async function saveLogo(url: string, updatedBy?: number) {
  const [row] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  const previous = row.logoUrl;
  await row.update({ logoUrl: url, updatedBy: updatedBy ?? null });
  return { previous, logoUrl: row.logoUrl };
}

export async function clearLogo(updatedBy?: number) {
  const row = await findSettings();
  if (!row) return null;
  const previous = row.logoUrl;
  await row.update({ logoUrl: null, updatedBy: updatedBy ?? null });
  return previous;
}

function serializeSettings(row: PlatformSetting | null) {
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
