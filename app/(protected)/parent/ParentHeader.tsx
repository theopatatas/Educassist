"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  LogOut,
  Settings,
  Scale,
  UserCircle,
  X,
  Users,
} from "lucide-react";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import { getLocal, setLocal } from "@/src/lib/storage/local";
import EventNotifications from "../EventNotifications";
import { useParentStudent } from "./ParentStudentContext";

export default function ParentHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    students,
    selectedStudent,
    selectedStudentId,
    loading: studentsLoading,
    error: studentsError,
    selectStudent,
  } = useParentStudent();
  const parentDisplayNameKey = useMemo(() => {
    const identity = user?.id ? String(user.id) : user?.email || "guest";
    return `educassist_parent_display_name_${identity}`;
  }, [user?.email, user?.id]);
  const [displayName, setDisplayName] = useState<string>(
    () => getLocal<string>(parentDisplayNameKey) || "",
  );
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [phoneLabel, setPhoneLabel] = useState("Not provided");
  const [linkedStudentLabel, setLinkedStudentLabel] = useState("Not linked");
  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");

  const fallbackDisplayName = useMemo(() => {
    if (profileName.trim()) return profileName.trim();
    const email = user?.email || "";
    const local = email.split("@")[0]?.trim();
    if (!local) return "Parent";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [profileName, user?.email]);
  const activeDisplayName = displayName.trim() || fallbackDisplayName;

  const persistDisplayName = () => {
    const value = displayNameDraft.trim();
    setDisplayName(value);
    setLocal(parentDisplayNameKey, value);
  };

  const openProfileModal = () => {
    setDisplayNameDraft(activeDisplayName);
    setShowProfileModal(true);
  };

  const initials = activeDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const handleChangePassword = async () => {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
      setPasswordStatus("Please fill in all password fields.");
      return;
    }
    if (next.length < 8) {
      setPasswordStatus("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setPasswordStatus("New password and confirm password do not match.");
      return;
    }

    setPasswordStatus("Updating password...");
    try {
      const { data } = await api.patch("/api/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      setPasswordStatus(data?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setPasswordStatus(error.response?.data?.message || "Failed to update password.");
    }
  };

  useEffect(() => {
    let active = true;
    api
      .get("/api/parents/me")
      .then(({ data }) => {
        if (!active) return;
        const phone = data?.parent?.phone;
        const firstName = String(data?.parent?.firstName ?? "").trim();
        const lastName = String(data?.parent?.lastName ?? "").trim();
        const studentId = data?.parent?.studentId;
        const studentName = data?.parent?.studentName;
        setPhoneLabel(phone ? String(phone) : "Not provided");
        setProfileName([firstName, lastName].filter(Boolean).join(" ").trim());
        if (studentName) {
          setLinkedStudentLabel(String(studentName));
        } else {
          setLinkedStudentLabel(studentId ? `Student #${studentId}` : "Not linked");
        }
      })
      .catch(() => {
        if (active) {
          setPhoneLabel("Not provided");
          setLinkedStudentLabel("Not linked");
          setProfileName("");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 px-2 shadow-md backdrop-blur sm:px-4 lg:px-6">
        <div className="flex h-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="hidden leading-tight lg:block">
                <span className="block text-xl font-extrabold text-slate-900">EducAssist</span>
                <span className="block -mt-1 text-[11px] text-slate-500">Parent Portal</span>
              </div>
            </div>
          </div>

          <div className="relative mx-2 min-w-0 flex-1 sm:mx-4">
            <button
              type="button"
              onClick={() => setShowStudentMenu((current) => !current)}
              className="mx-auto flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:min-w-64"
              aria-expanded={showStudentMenu}
              aria-label="Switch student"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-900 sm:text-sm">
                  {studentsLoading
                    ? "Loading students…"
                    : selectedStudent?.name || "No linked student"}
                </span>
                <span className="hidden truncate text-[11px] text-slate-500 sm:block">
                  {selectedStudent
                    ? [
                        selectedStudent.gradeLevel,
                        selectedStudent.sectionName,
                      ]
                        .filter(Boolean)
                        .join(" – ") || "Academic profile"
                    : studentsError || "Student profile unavailable"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {showStudentMenu ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowStudentMenu(false)}
                  aria-label="Close student selector"
                />
                <div className="fixed left-1/2 top-16 z-50 mt-2 max-h-[calc(100vh-5rem)] w-[calc(100vw-1rem)] max-w-96 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Switch Student
                  </p>
                  {students.length ? (
                    students.map((student) => {
                      const selected = student.id === selectedStudentId;
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => {
                            selectStudent(student.id);
                            setShowStudentMenu(false);
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                            selected
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {student.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {[student.gradeLevel, student.sectionName]
                                .filter(Boolean)
                                .join(" – ") || "Not assigned"}
                            </span>
                            {selected ? (
                              <span className="mt-1 block text-[11px] font-medium text-emerald-600">
                                Currently Selected
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                      {studentsError || "No linked students found."}
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={() => router.push("/parent/disciplinary-records")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:px-3"
              aria-label="Open disciplinary records"
            >
              <Scale className="h-4 w-4" />
              <span className="hidden xl:inline">Disciplinary Records</span>
            </button>
            <EventNotifications
              eventHref="/parent/dashboard"
              studentId={selectedStudentId}
            />

            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 text-sm font-semibold text-slate-700"
                onClick={() => setShowProfileMenu((v) => !v)}
                aria-label="Open profile menu"
              >
                {initials || "P"}
              </button>

              {showProfileMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-[min(15rem,calc(100vw-1rem))] overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                    <div className="px-4 pb-2 pt-3">
                      <p className="text-sm font-semibold text-slate-900">{activeDisplayName}</p>
                      <p className="text-xs text-slate-500">Parent</p>
                    </div>
                    <div className="border-t" />
                    <button
                      onClick={() => {
                        openProfileModal();
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <UserCircle className="h-4 w-4" /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setPasswordStatus("");
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button
                      onClick={() => {
                        router.push("/parent/disciplinary-records");
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <Scale className="h-4 w-4" /> Disciplinary Records
                    </button>
                    <div className="my-2 border-t" />
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                      onClick={() => {
                        logout();
                        router.replace("/login");
                      }}
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {showProfileModal ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] sm:gap-4 sm:p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                {initials || "P"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">{activeDisplayName}</h2>
                <p className="text-xs text-slate-500">Parent</p>
              </div>
              <X className="cursor-pointer text-slate-500 hover:text-black" onClick={() => setShowProfileModal(false)} />
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label className="text-xs font-medium text-slate-500">Display Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Role</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  defaultValue="Parent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Guardian Number</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  value={phoneLabel}
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Linked Student</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  value={selectedStudent?.name || linkedStudentLabel}
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-4 shadow-[0_-1px_0_0_rgba(15,23,42,0.08)] sm:p-5">
              <button onClick={() => setShowProfileModal(false)} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Close
              </button>
              <button
                onClick={() => {
                  persistDisplayName();
                  setShowProfileModal(false);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showSettingsModal ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-bold">Settings</h2>
              <X className="cursor-pointer text-slate-500 hover:text-black" onClick={() => setShowSettingsModal(false)} />
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Change Password</p>
                <div className="mt-3 space-y-3">
                  <input
                    type={showPasswords ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <input
                    type={showPasswords ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    type={showPasswords ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {showPasswords ? "Hide passwords" : "Show passwords"}
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Update Password
                  </button>
                  {passwordStatus ? <p className="text-xs text-slate-600">{passwordStatus}</p> : null}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t p-5">
              <button onClick={() => setShowSettingsModal(false)} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
