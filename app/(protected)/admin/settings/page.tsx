"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  Building2,
  ImageIcon,
  MonitorCog,
  Palette,
  RotateCcw,
  Save,
  Upload,
  UserCog,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPanel, InsightState } from "../_components/AdminInsightsUI";
import {
  getAdminSettings,
  removeSchoolLogo,
  updateAdminSettingsSection,
  uploadSchoolLogo,
  type AcademicSettings,
  type AdminSettings,
  type AppearanceSettings,
  type GeneralSettings,
  type NotificationSettings,
  type UserManagementSettings,
} from "../_lib/admin-settings";
import { verifyAdminPassword } from "../_lib/admin-insights";

type EditableTab =
  | "general"
  | "academic"
  | "userManagement"
  | "notifications"
  | "appearance";
type TabId = EditableTab | "branding" | "system";
type Notice = { type: "success" | "error"; message: string };

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: ImageIcon },
  { id: "academic", label: "Academic", icon: BookOpenCheck },
  { id: "userManagement", label: "User Management", icon: UserCog },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "system", label: "System Information", icon: MonitorCog },
];

const blankGeneral: GeneralSettings = {
  schoolName: "",
  schoolAddress: "",
  schoolContactNumber: "",
  schoolEmail: "",
  schoolLogoUrl: null,
  schoolMotto: "",
  timeZone: "",
  currentAcademicYear: "",
};
const blankAcademic: AcademicSettings = {
  currentSchoolYear: "",
  currentSemester: "",
  currentQuarter: "",
  passingGrade: "",
  promotionPolicy: "",
};
const blankUsers: UserManagementSettings = {
  requirePasswordChange: null,
  allowPasswordReset: null,
  defaultPasswordPolicy: "",
};
const blankNotifications: NotificationSettings = {
  emailNotifications: null,
  inAppNotifications: null,
  accountCreationNotifications: null,
  passwordResetNotifications: null,
  systemAnnouncements: null,
};
const blankAppearance: AppearanceSettings = {
  theme: null,
  compactLayout: null,
};
const emptySettings: AdminSettings = {
  general: null,
  academic: null,
  userManagement: null,
  security: null,
  notifications: null,
  appearance: null,
  branding: { logoUrl: null },
  systemInformation: {
    lmsVersion: null,
    buildVersion: null,
    apiVersion: null,
    environment: null,
    lastUpdated: null,
  },
};

function message(error: unknown, fallback: string) {
  const value = error as {
    code?: string;
    response?: { data?: { message?: string } };
  };
  if (value.code === "ECONNABORTED") {
    return "The upload timed out. Restart the backend and try again.";
  }
  return value.response?.data?.message || fallback;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-1 h-11 w-full rounded-xl border px-3 outline-none focus:ring-2 focus:ring-slate-200 ${error ? "border-rose-300" : "border-slate-200"}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      <span className="ml-1 text-rose-500">*</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 outline-none focus:ring-2 focus:ring-slate-200 ${error ? "border-rose-300" : "border-slate-200"}`}
      >
        <option value="">Select time zone</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <p className="font-medium text-slate-800">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value === true}
        onClick={() => onChange(value !== true)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-slate-900" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}

function Actions({
  dirty,
  onReset,
  onSave,
  saving,
}: {
  dirty: boolean;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="h-4 w-4" />
        Cancel Changes
      </button>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Unsaved Changes
      </button>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={onSave}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saved, setSaved] = useState<AdminSettings>(emptySettings);
  const [draft, setDraft] = useState<AdminSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState<EditableTab | null>(null);
  const [pendingLogoAction, setPendingLogoAction] = useState<
    "upload" | "remove" | null
  >(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifyingSave, setVerifyingSave] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const settings = await getAdminSettings();
      setSaved(settings);
      setDraft(settings);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);
  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  const general = draft.general ?? blankGeneral;
  const academic = draft.academic ?? blankAcademic;
  const users = draft.userManagement ?? blankUsers;
  const notifications = draft.notifications ?? blankNotifications;
  const appearance = draft.appearance ?? blankAppearance;
  const timeZones = useMemo(() => {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    const values = supported?.length ? supported : ["Asia/Manila"];
    return general.timeZone && !values.includes(general.timeZone)
      ? [general.timeZone, ...values]
      : values;
  }, [general.timeZone]);
  const dirty = (section: EditableTab) =>
    JSON.stringify(draft[section]) !== JSON.stringify(saved[section]);
  const setSection = <K extends EditableTab>(
    section: K,
    value: NonNullable<AdminSettings[K]>,
  ) => setDraft((current) => ({ ...current, [section]: value }));
  const reset = (section: EditableTab) => {
    setDraft((current) => ({ ...current, [section]: saved[section] }));
    setErrors({});
  };

  const validate = (section: EditableTab) => {
    const next: Record<string, string> = {};
    if (section === "general") {
      if (!general.schoolName.trim())
        next.schoolName = "School name is required.";
      if (!general.schoolAddress.trim())
        next.schoolAddress = "School address is required.";
      if (!/^09\d{9}$/.test(general.schoolContactNumber))
        next.schoolContactNumber = "Enter 11 digits beginning with 09.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(general.schoolEmail))
        next.schoolEmail = "Enter a valid school email.";
      if (!general.timeZone.trim()) next.timeZone = "Time zone is required.";
      if (!general.currentAcademicYear.trim())
        next.currentAcademicYear = "Academic year is required.";
    }
    if (section === "academic") {
      if (!academic.currentSchoolYear.trim())
        next.currentSchoolYear = "School year is required.";
      if (!academic.currentSemester.trim())
        next.currentSemester = "Semester is required.";
      if (!academic.currentQuarter.trim())
        next.currentQuarter = "Quarter is required.";
      const grade = Number(academic.passingGrade);
      if (!academic.passingGrade || grade < 0 || grade > 100)
        next.passingGrade = "Enter a grade from 0 to 100.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const requestSave = (section: EditableTab) => {
    if (validate(section)) {
      setPendingSave(section);
      setAdminPassword("");
      setPasswordError("");
    }
  };
  const confirmSave = async () => {
    if (!pendingSave || saving) return;
    setSaving(true);
    try {
      const value = draft[pendingSave];
      if (!value) return;
      const updated = await updateAdminSettingsSection(
        pendingSave,
        value as never,
      );
      setSaved((current) => ({ ...current, [pendingSave]: updated }));
      setDraft((current) => ({ ...current, [pendingSave]: updated }));
      setNotice({ type: "success", message: "Settings saved successfully." });
      setPendingSave(null);
      setAdminPassword("");
    } catch (error) {
      setNotice({
        type: "error",
        message: message(error, "Settings could not be saved."),
      });
    } finally {
      setSaving(false);
    }
  };

  const chooseLogo = (file?: File) => {
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return setLogoError("Choose a PNG, JPG, or WebP image.");
    if (file.size > 2 * 1024 * 1024)
      return setLogoError("The school logo must not exceed 2 MB.");
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const saveSelectedLogo = async () => {
    if (!logoFile || saving) return;
    setSaving(true);
    try {
      const url = await uploadSchoolLogo(logoFile);
      setSaved((current) => ({ ...current, branding: { logoUrl: url } }));
      setDraft((current) => ({ ...current, branding: { logoUrl: url } }));
      setLogoFile(null);
      if (fileInput.current) fileInput.current.value = "";
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      window.dispatchEvent(
        new CustomEvent("educassist-branding-updated", {
          detail: { logoUrl: url },
        }),
      );
      setNotice({
        type: "success",
        message: "School logo saved successfully.",
      });
      setPendingLogoAction(null);
      setAdminPassword("");
    } catch (error) {
      setLogoError(message(error, "School logo upload failed."));
    } finally {
      setSaving(false);
    }
  };
  const deleteLogo = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await removeSchoolLogo();
      setSaved((current) => ({ ...current, branding: { logoUrl: null } }));
      setDraft((current) => ({ ...current, branding: { logoUrl: null } }));
      window.dispatchEvent(
        new CustomEvent("educassist-branding-updated", {
          detail: { logoUrl: null },
        }),
      );
      setNotice({ type: "success", message: "School logo removed." });
      setPendingLogoAction(null);
      setAdminPassword("");
    } catch (error) {
      setLogoError(message(error, "School logo could not be removed."));
    } finally {
      setSaving(false);
    }
  };
  const backendBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const storedLogo = draft.branding.logoUrl
    ? `${backendBase}${draft.branding.logoUrl}`
    : null;

  const verifyAndSave = async () => {
    if (!adminPassword || verifyingSave || saving) return;
    setVerifyingSave(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      if (pendingSave) await confirmSave();
      else if (pendingLogoAction === "upload") await saveSelectedLogo();
      else if (pendingLogoAction === "remove") await deleteLogo();
    } catch (error) {
      setPasswordError(
        message(error, "Super Admin password verification failed."),
      );
    } finally {
      setVerifyingSave(false);
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-[1500px]">
        <InsightState loading />
      </div>
    );
  if (loadError)
    return (
      <div className="mx-auto max-w-[1500px]">
        <InsightState error />
        <button
          onClick={() => void loadSettings()}
          className="mx-auto mt-3 block rounded-xl border px-4 py-2"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer">
      {notice ? (
        <div
          role="status"
          className={`flex justify-between rounded-xl border px-4 py-3 ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        Configure school information, academic rules, notifications, and
        appearance.
      </p>
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-20"
          aria-label="Settings sections"
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Settings
          </p>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setErrors({});
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium ${activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="min-w-0">
          {activeTab === "general" ? (
            <AdminPanel
              title="General Settings"
              description="School identity and contact details."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="School Name"
                  required
                  value={general.schoolName}
                  error={errors.schoolName}
                  onChange={(value) =>
                    setSection("general", { ...general, schoolName: value })
                  }
                />
                <TextField
                  label="School Address"
                  required
                  value={general.schoolAddress}
                  error={errors.schoolAddress}
                  onChange={(value) =>
                    setSection("general", { ...general, schoolAddress: value })
                  }
                />
                <TextField
                  label="School Contact Number"
                  required
                  type="tel"
                  value={general.schoolContactNumber}
                  error={errors.schoolContactNumber}
                  onChange={(value) =>
                    setSection("general", {
                      ...general,
                      schoolContactNumber: value
                        .replace(/\D/g, "")
                        .slice(0, 11),
                    })
                  }
                />
                <TextField
                  label="School Email"
                  required
                  type="email"
                  value={general.schoolEmail}
                  error={errors.schoolEmail}
                  onChange={(value) =>
                    setSection("general", { ...general, schoolEmail: value })
                  }
                />
                <TextField
                  label="School Motto (Optional)"
                  value={general.schoolMotto}
                  onChange={(value) =>
                    setSection("general", { ...general, schoolMotto: value })
                  }
                />
                <SelectField
                  label="Time Zone"
                  value={general.timeZone}
                  options={timeZones}
                  error={errors.timeZone}
                  onChange={(value) =>
                    setSection("general", { ...general, timeZone: value })
                  }
                />
                <TextField
                  label="Current Academic Year"
                  required
                  value={general.currentAcademicYear}
                  error={errors.currentAcademicYear}
                  onChange={(value) =>
                    setSection("general", {
                      ...general,
                      currentAcademicYear: value,
                    })
                  }
                />
              </div>
              <Actions
                dirty={dirty("general")}
                saving={saving}
                onReset={() => reset("general")}
                onSave={() => requestSave("general")}
              />
            </AdminPanel>
          ) : null}
          {activeTab === "branding" ? (
            <AdminPanel
              title="School Branding"
              description="Upload the official school logo."
            >
              <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div
                  role="img"
                  aria-label="School logo preview"
                  style={{
                    backgroundImage: `url(${logoPreview || storedLogo || ""})`,
                  }}
                  className="aspect-square rounded-2xl border border-dashed border-slate-300 bg-slate-50 bg-contain bg-center bg-no-repeat"
                >
                  {!logoPreview && !storedLogo ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="h-8 w-8" />
                      <span className="mt-2">No logo uploaded</span>
                    </div>
                  ) : null}
                </div>
                <div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => chooseLogo(event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"
                    >
                      <Upload className="h-4 w-4" />
                      {logoFile || storedLogo ? "Replace Logo" : "Select Logo"}
                    </button>
                    <button
                      disabled={!storedLogo || saving}
                      onClick={() => {
                        setPendingLogoAction("remove");
                        setAdminPassword("");
                        setPasswordError("");
                      }}
                      className="rounded-xl border px-4 py-2 text-rose-600 disabled:opacity-40"
                    >
                      Remove Logo
                    </button>
                  </div>
                  <p className="mt-3 text-slate-500">
                    PNG, JPG, or WebP. Maximum 2 MB.
                  </p>
                  {logoError ? (
                    <p className="mt-2 text-rose-600">{logoError}</p>
                  ) : null}
                  {logoFile ? (
                    <button
                      disabled={saving}
                      onClick={() => {
                        setPendingLogoAction("upload");
                        setAdminPassword("");
                        setPasswordError("");
                      }}
                      className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white"
                    >
                      {saving ? "Uploading…" : "Save Logo"}
                    </button>
                  ) : null}
                </div>
              </div>
            </AdminPanel>
          ) : null}
          {activeTab === "academic" ? (
            <AdminPanel
              title="Academic Settings"
              description="Academic periods and grading policy."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Current School Year"
                  required
                  value={academic.currentSchoolYear}
                  error={errors.currentSchoolYear}
                  onChange={(value) =>
                    setSection("academic", {
                      ...academic,
                      currentSchoolYear: value,
                    })
                  }
                />
                <TextField
                  label="Current Semester"
                  required
                  value={academic.currentSemester}
                  error={errors.currentSemester}
                  onChange={(value) =>
                    setSection("academic", {
                      ...academic,
                      currentSemester: value,
                    })
                  }
                />
                <TextField
                  label="Current Quarter"
                  required
                  value={academic.currentQuarter}
                  error={errors.currentQuarter}
                  onChange={(value) =>
                    setSection("academic", {
                      ...academic,
                      currentQuarter: value,
                    })
                  }
                />
                <TextField
                  label="Passing Grade"
                  required
                  type="number"
                  value={academic.passingGrade}
                  error={errors.passingGrade}
                  onChange={(value) =>
                    setSection("academic", { ...academic, passingGrade: value })
                  }
                />
                <TextField
                  label="Promotion Policy"
                  value={academic.promotionPolicy}
                  onChange={(value) =>
                    setSection("academic", {
                      ...academic,
                      promotionPolicy: value,
                    })
                  }
                />
              </div>
              <Actions
                dirty={dirty("academic")}
                saving={saving}
                onReset={() => reset("academic")}
                onSave={() => requestSave("academic")}
              />
            </AdminPanel>
          ) : null}
          {activeTab === "userManagement" ? (
            <AdminPanel
              title="User Management Settings"
              description="Authentication defaults for managed users."
            >
              <div className="space-y-3">
                <Toggle
                  label="Require password change on first login"
                  value={users.requirePasswordChange}
                  onChange={(value) =>
                    setSection("userManagement", {
                      ...users,
                      requirePasswordChange: value,
                    })
                  }
                />
                <Toggle
                  label="Allow users to reset passwords"
                  value={users.allowPasswordReset}
                  onChange={(value) =>
                    setSection("userManagement", {
                      ...users,
                      allowPasswordReset: value,
                    })
                  }
                />
                <TextField
                  label="Default Password Policy"
                  value={users.defaultPasswordPolicy}
                  onChange={(value) =>
                    setSection("userManagement", {
                      ...users,
                      defaultPasswordPolicy: value,
                    })
                  }
                />
              </div>
              <Actions
                dirty={dirty("userManagement")}
                saving={saving}
                onReset={() => reset("userManagement")}
                onSave={() => requestSave("userManagement")}
              />
            </AdminPanel>
          ) : null}
          {activeTab === "notifications" ? (
            <AdminPanel
              title="Notification Settings"
              description="Control platform notification delivery."
            >
              <div className="space-y-3">
                {(
                  [
                    ["emailNotifications", "Email Notifications"],
                    ["inAppNotifications", "In-App Notifications"],
                    [
                      "accountCreationNotifications",
                      "Account Creation Notifications",
                    ],
                    [
                      "passwordResetNotifications",
                      "Password Reset Notifications",
                    ],
                    ["systemAnnouncements", "System Announcements"],
                  ] as const
                ).map(([key, label]) => (
                  <Toggle
                    key={key}
                    label={label}
                    value={notifications[key]}
                    onChange={(value) =>
                      setSection("notifications", {
                        ...notifications,
                        [key]: value,
                      })
                    }
                  />
                ))}
              </div>
              <Actions
                dirty={dirty("notifications")}
                saving={saving}
                onReset={() => reset("notifications")}
                onSave={() => requestSave("notifications")}
              />
            </AdminPanel>
          ) : null}
          {activeTab === "appearance" ? (
            <AdminPanel
              title="Appearance Settings"
              description="Select the preferred interface appearance."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() =>
                      setSection("appearance", { ...appearance, theme })
                    }
                    className={`rounded-2xl border p-5 text-left capitalize ${appearance.theme === theme ? "border-slate-900 ring-2 ring-slate-100" : "border-slate-200"}`}
                  >
                    <Palette className="h-5 w-5" />
                    <span className="mt-4 block font-semibold">
                      {theme} Theme
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <Toggle
                  label="Compact Layout"
                  value={appearance.compactLayout}
                  onChange={(value) =>
                    setSection("appearance", {
                      ...appearance,
                      compactLayout: value,
                    })
                  }
                />
              </div>
              <Actions
                dirty={dirty("appearance")}
                saving={saving}
                onReset={() => reset("appearance")}
                onSave={() => requestSave("appearance")}
              />
            </AdminPanel>
          ) : null}
          {activeTab === "system" ? (
            <AdminPanel
              title="System Information"
              description="Read-only backend deployment metadata."
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                {Object.entries({
                  "LMS Version": draft.systemInformation.lmsVersion,
                  "Build Version": draft.systemInformation.buildVersion,
                  "API Version": draft.systemInformation.apiVersion,
                  Environment: draft.systemInformation.environment,
                  "Last Updated": draft.systemInformation.lastUpdated
                    ? new Date(
                        draft.systemInformation.lastUpdated,
                      ).toLocaleString()
                    : null,
                }).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </AdminPanel>
          ) : null}
        </div>
      </div>
      {pendingSave || pendingLogoAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Verify Settings Change</h2>
            <p className="mt-2 text-slate-600">
              Enter your Super Admin password before applying this change.
            </p>
            <label className="mt-4 block font-medium text-slate-600">
              Super Admin Password
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => {
                  setAdminPassword(event.target.value);
                  setPasswordError("");
                }}
                autoComplete="current-password"
                autoFocus
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {passwordError ? (
              <p className="mt-2 text-rose-600" role="alert">
                {passwordError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={saving || verifyingSave}
                onClick={() => {
                  setPendingSave(null);
                  setPendingLogoAction(null);
                  setAdminPassword("");
                  setPasswordError("");
                }}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={!adminPassword || saving || verifyingSave}
                onClick={() => void verifyAndSave()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
              >
                {saving || verifyingSave ? "Verifying…" : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
