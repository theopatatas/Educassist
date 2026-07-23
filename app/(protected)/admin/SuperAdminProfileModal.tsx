"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { AdminPanel, InsightState } from "./_components/AdminInsightsUI";
import {
  changeSuperAdminPassword,
  getSuperAdminProfile,
  removeSuperAdminPhoto,
  updateSuperAdminProfile,
  uploadSuperAdminPhoto,
  type ProfileUpdate,
  type SuperAdminProfile,
} from "./_lib/admin-profile";

type Props = {
  onClose?: () => void;
  onUpdated: (profile: SuperAdminProfile) => void;
  accountLabel?: string;
  embedded?: boolean;
};
type Notice = { type: "success" | "error"; message: string };
const emptyDraft: ProfileUpdate = {
  firstName: "",
  middleName: "",
  lastName: "",
  displayName: "",
  email: "",
  mobileNumber: "",
};
const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function errorMessage(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: string } } };
  return value.response?.data?.message || fallback;
}
function cleanName(value: string) {
  return value
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/(^|\s)[a-z]/g, (letter) => letter.toUpperCase());
}
function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function SuperAdminProfileModal({
  onClose,
  onUpdated,
  accountLabel = "Super Admin",
  embedded = false,
}: Props) {
  const [profile, setProfile] = useState<SuperAdminProfile | null>(null);
  const [draft, setDraft] = useState<ProfileUpdate>(emptyDraft);
  const [tab, setTab] = useState<"profile" | "security" | "activity">(
    "profile",
  );
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const value = await getSuperAdminProfile();
      setProfile(value);
      setDraft({
        firstName: value.firstName ?? "",
        middleName: value.middleName ?? "",
        lastName: value.lastName ?? "",
        displayName: value.displayName ?? "",
        email: value.email,
        mobileNumber: value.mobileNumber ?? "",
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const originalDraft = useMemo<ProfileUpdate>(
    () =>
      profile
        ? {
            firstName: profile.firstName ?? "",
            middleName: profile.middleName ?? "",
            lastName: profile.lastName ?? "",
            displayName: profile.displayName ?? "",
            email: profile.email,
            mobileNumber: profile.mobileNumber ?? "",
          }
        : emptyDraft,
    [profile],
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(originalDraft);
  const photoUrl =
    photoPreview ||
    (profile?.profilePhotoUrl ? `${apiBase}${profile.profilePhotoUrl}` : null);
  const initials =
    [draft.firstName, draft.lastName]
      .map((value) => value?.trim() ?? "")
      .filter(Boolean)
      .map((value) => value[0])
      .join("")
      .toUpperCase() || "A";
  const passwordValid =
    passwords.current.length > 0 &&
    passwords.next.length >= 8 &&
    passwords.next === passwords.confirm;
  const strength =
    passwords.next.length >= 12
      ? "Strong"
      : passwords.next.length >= 8
        ? "Good"
        : passwords.next.length
          ? "Weak"
          : "";

  const requestClose = () => {
    if (dirty || photoFile) setConfirmDiscard(true);
    else onClose?.();
  };
  const validateProfile = () => {
    const next: Record<string, string> = {};
    if (!draft.firstName?.trim()) next.firstName = "First name is required.";
    if (!draft.lastName?.trim()) next.lastName = "Last name is required.";
    if (!draft.displayName?.trim())
      next.displayName = "Display name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      next.email = "Enter a valid email.";
    if (!/^09\d{9}$/.test(draft.mobileNumber ?? ""))
      next.mobileNumber = "Enter 11 digits beginning with 09.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const saveProfile = async () => {
    if (!validateProfile() || saving) return;
    setSaving(true);
    try {
      const value = await updateSuperAdminProfile(draft);
      setProfile(value);
      onUpdated(value);
      setNotice({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setNotice({
        type: "error",
        message: errorMessage(error, "Profile update failed."),
      });
    } finally {
      setSaving(false);
    }
  };
  const choosePhoto = (file?: File) => {
    setPhotoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return setPhotoError("Choose a PNG, JPG, or WebP image.");
    if (file.size > 2 * 1024 * 1024)
      return setPhotoError("Profile picture must not exceed 2 MB.");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  const savePhoto = async () => {
    if (!photoFile || saving) return;
    setSaving(true);
    try {
      const value = await uploadSuperAdminPhoto(photoFile);
      setProfile(value);
      onUpdated(value);
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      if (photoInput.current) photoInput.current.value = "";
      setNotice({ type: "success", message: "Profile picture updated." });
    } catch (error) {
      setPhotoError(errorMessage(error, "Profile picture upload failed."));
    } finally {
      setSaving(false);
    }
  };
  const removePhoto = async () => {
    if (!profile?.profilePhotoUrl || saving) return;
    setSaving(true);
    try {
      const value = await removeSuperAdminPhoto();
      setProfile(value);
      onUpdated(value);
      setNotice({ type: "success", message: "Profile picture removed." });
    } catch (error) {
      setPhotoError(
        errorMessage(error, "Profile picture could not be removed."),
      );
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async () => {
    if (!passwordValid || saving) return;
    setPasswordError("");
    setSaving(true);
    try {
      await changeSuperAdminPassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setNotice({
        type: "success",
        message:
          "Password changed successfully. Sign in again when this session expires.",
      });
      const refreshed = await getSuperAdminProfile();
      setProfile(refreshed);
      onUpdated(refreshed);
    } catch (error) {
      setPasswordError(errorMessage(error, "Password change failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? "w-full"
          : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-5"
      }
      onMouseDown={(event) =>
        !embedded && event.target === event.currentTarget && requestClose()
      }
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${accountLabel} Profile`}
        className={`${embedded ? "min-h-[calc(100vh-7rem)]" : "max-h-[calc(100vh-1.5rem)] max-w-5xl overflow-y-auto"} w-full rounded-2xl bg-slate-50 shadow-2xl`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account Management
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              My Profile
            </h2>
          </div>
          {!embedded ? (
            <button
              onClick={requestClose}
              className="rounded-xl p-2 hover:bg-slate-100"
              aria-label="Close profile"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </header>
        {notice ? (
          <div
            role="status"
            className={`mx-4 mt-4 flex justify-between rounded-xl border px-4 py-3 sm:mx-6 ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
          >
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <nav className="mx-4 mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 sm:mx-6">
          {(
            [
              ["profile", "Personal Information", UserCircle],
              ["security", "Security", LockKeyhole],
              ["activity", "Activity Timeline", ShieldCheck],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-medium ${tab === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 sm:p-6">
          {loading ? (
            <InsightState loading />
          ) : failed ? (
            <div>
              <InsightState error />
              <button
                onClick={() => void load()}
                className="mx-auto mt-3 block rounded-xl border px-4 py-2"
              >
                Retry
              </button>
            </div>
          ) : !profile ? (
            <InsightState emptyLabel="Profile information is unavailable." />
          ) : (
            <>
              {tab === "profile" ? (
                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="space-y-5">
                    <AdminPanel
                      title="Profile Picture"
                      description="PNG, JPG, or WebP. Maximum 2 MB."
                    >
                      <div
                        className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 bg-cover bg-center text-3xl font-bold text-slate-600 shadow"
                        style={
                          photoUrl
                            ? { backgroundImage: `url(${photoUrl})` }
                            : undefined
                        }
                      >
                        {!photoUrl ? initials : null}
                      </div>
                      <input
                        ref={photoInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) =>
                          choosePhoto(event.target.files?.[0])
                        }
                      />
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => photoInput.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
                        >
                          <Camera className="h-4 w-4" />
                          {profile.profilePhotoUrl ? "Replace" : "Select"}
                        </button>
                        <button
                          disabled={!profile.profilePhotoUrl || saving}
                          onClick={() => void removePhoto()}
                          className="rounded-xl border p-2 text-rose-600 disabled:opacity-40"
                          aria-label="Remove profile picture"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {photoFile ? (
                        <button
                          disabled={saving}
                          onClick={() => void savePhoto()}
                          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-white"
                        >
                          {saving ? "Uploading…" : "Save Picture"}
                        </button>
                      ) : null}
                      {photoError ? (
                        <p className="mt-2 text-rose-600">{photoError}</p>
                      ) : null}
                    </AdminPanel>
                    <AdminPanel
                      title="Account Information"
                      description="Read-only backend account details."
                    >
                      <dl className="space-y-3">
                        {[
                          ["User ID", profile.id],
                          ["Account Role", profile.role.replaceAll("_", " ")],
                          [
                            "Account Status",
                            profile.isActive ? "Active" : "Inactive",
                          ],
                          ["Created", dateLabel(profile.createdAt)],
                          ["Last Updated", dateLabel(profile.updatedAt)],
                          ["Last Login", dateLabel(profile.lastLoginAt)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-slate-500">{label}</dt>
                            <dd className="font-medium capitalize text-slate-900">
                              {value || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </AdminPanel>
                  </div>
                  <AdminPanel
                    title="Personal Information"
                    description="Update backend-supported profile fields."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          ["firstName", "First Name"],
                          ["middleName", "Middle Name (Optional)"],
                          ["lastName", "Last Name"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="font-medium text-slate-600">
                          {label}
                          <input
                            value={draft[key] ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [key]: cleanName(event.target.value),
                              }))
                            }
                            className="mt-1 h-11 w-full rounded-xl border px-3"
                          />
                          {errors[key] ? (
                            <span className="text-rose-600">{errors[key]}</span>
                          ) : null}
                        </label>
                      ))}
                      <label className="font-medium text-slate-600">
                        Display Name
                        <input
                          value={draft.displayName ?? ""}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              displayName: event.target.value.slice(0, 150),
                            }))
                          }
                          className="mt-1 h-11 w-full rounded-xl border px-3"
                        />
                        {errors.displayName ? (
                          <span className="text-rose-600">
                            {errors.displayName}
                          </span>
                        ) : null}
                      </label>
                      <label className="font-medium text-slate-600 sm:col-span-2">
                        Email Address
                        <input
                          type="email"
                          value={draft.email}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          className="mt-1 h-11 w-full rounded-xl border px-3"
                        />
                        {errors.email ? (
                          <span className="text-rose-600">{errors.email}</span>
                        ) : null}
                      </label>
                      <label className="font-medium text-slate-600 sm:col-span-2">
                        Mobile Number
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={draft.mobileNumber ?? ""}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              mobileNumber: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 11),
                            }))
                          }
                          className="mt-1 h-11 w-full rounded-xl border px-3"
                        />
                        {errors.mobileNumber ? (
                          <span className="text-rose-600">
                            {errors.mobileNumber}
                          </span>
                        ) : null}
                      </label>
                      <label className="font-medium text-slate-600 sm:col-span-2">
                        Role
                        <input
                          disabled
                          value={profile.role.replaceAll("_", " ")}
                          className="mt-1 h-11 w-full rounded-xl border bg-slate-100 px-3 capitalize"
                        />
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
                      <button
                        disabled={!dirty || saving}
                        onClick={() => setDraft(originalDraft)}
                        className="rounded-xl border px-4 py-2 disabled:opacity-40"
                      >
                        Cancel Changes
                      </button>
                      <button
                        disabled={!dirty || saving}
                        onClick={() => setDraft(originalDraft)}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 disabled:opacity-40"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </button>
                      <button
                        disabled={!dirty || saving}
                        onClick={() => void saveProfile()}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </AdminPanel>
                </div>
              ) : null}
              {tab === "security" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  <AdminPanel
                    title="Change Password"
                    description="Use at least 8 characters for the new password."
                  >
                    {(
                      [
                        ["current", "Current Password"],
                        ["next", "New Password"],
                        ["confirm", "Confirm New Password"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="mt-3 block font-medium text-slate-600"
                      >
                        {label}
                        <div className="relative mt-1">
                          <input
                            type={showPasswords[key] ? "text" : "password"}
                            value={passwords[key]}
                            onChange={(event) => {
                              setPasswords((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }));
                              setPasswordError("");
                            }}
                            className="h-11 w-full rounded-xl border px-3 pr-11"
                          />
                          <button
                            onClick={() =>
                              setShowPasswords((current) => ({
                                ...current,
                                [key]: !current[key],
                              }))
                            }
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2"
                            aria-label={
                              showPasswords[key]
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showPasswords[key] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </label>
                    ))}
                    {strength ? (
                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded bg-slate-100">
                          <div
                            className={`h-full ${strength === "Strong" ? "w-full bg-emerald-500" : strength === "Good" ? "w-2/3 bg-amber-500" : "w-1/3 bg-rose-500"}`}
                          />
                        </div>
                        <p className="mt-1 text-slate-500">
                          Password strength: {strength}
                        </p>
                      </div>
                    ) : null}
                    {passwords.confirm &&
                    passwords.next !== passwords.confirm ? (
                      <p className="mt-2 text-rose-600">
                        Passwords do not match.
                      </p>
                    ) : null}
                    {passwordError ? (
                      <p className="mt-2 text-rose-600">{passwordError}</p>
                    ) : null}
                    <button
                      disabled={!passwordValid || saving}
                      onClick={() => void changePassword()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
                    >
                      <KeyRound className="h-4 w-4" />
                      {saving ? "Updating…" : "Change Password"}
                    </button>
                  </AdminPanel>
                  <AdminPanel
                    title="Security Information"
                    description="Only recorded backend security data is displayed."
                  >
                    <dl className="grid gap-4 sm:grid-cols-2">
                      {[
                        [
                          "Last Password Change",
                          dateLabel(profile.passwordChangedAt),
                        ],
                        ["Last Login", dateLabel(profile.lastLoginAt)],
                        ["Current Session", null],
                        ["Active Device", null],
                        ["Browser", null],
                        ["IP Address", null],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-3">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="mt-1 font-medium">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </AdminPanel>
                </div>
              ) : null}
              {tab === "activity" ? (
                <AdminPanel
                  title="Activity Timeline"
                  description="No activity-log endpoint is available."
                >
                  <InsightState emptyLabel="No backend profile activity records are available." />
                </AdminPanel>
              ) : null}
            </>
          )}
        </div>
      </section>
      {confirmDiscard ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-semibold">Discard Unsaved Changes?</h3>
            <p className="mt-2 text-slate-600">
              Your unsaved profile changes and selected picture will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="rounded-xl border px-4 py-2"
              >
                Keep Editing
              </button>
              <button
                onClick={() => onClose?.()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-white"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
