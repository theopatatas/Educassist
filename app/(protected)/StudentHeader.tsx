"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, LogOut, Settings, UserCircle, X, GraduationCap } from "lucide-react";
import type { AxiosError } from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import EventNotifications from "./EventNotifications";

const pageTitles: Record<string, string> = {
  "/student/dashboard": "Dashboard",
  "/student/classes": "My Classes",
  "/student/quiz-center": "Quiz Center",
  "/student/exam-hall": "Exam Schedule",
  "/student/assignment": "Assignment",
  "/student/grade-portal": "Grade Portal",
  "/student/attendance": "Attendance",
  "/student/reports": "Reports",
};

export default function StudentHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sectionLabel, setSectionLabel] = useState("Not assigned");
  const [gradeLevelLabel, setGradeLevelLabel] = useState("Not assigned");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");

  const displayName = useMemo(() => {
    const email = user?.email || "";
    const local = email.split("@")[0]?.trim();
    if (!local) return "Student";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [user?.email]);

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const activePageTitle =
    Object.entries(pageTitles).find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] || "Student Portal";

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New password and confirm password do not match.");
      return;
    }

    setPasswordStatus("Updating password...");
    try {
      const { data } = await api.patch("/api/auth/change-password", {
        currentPassword,
        newPassword,
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
      .get("/api/students/me")
      .then(({ data }) => {
        if (!active) return;
        const sectionId = data?.student?.sectionId;
        const yearLevel = data?.student?.yearLevel ?? data?.student?.gradeLevel;
        setSectionLabel(sectionId ? `Section ${sectionId}` : "Not assigned");
        setGradeLevelLabel(yearLevel ? String(yearLevel) : "Not assigned");
      })
      .catch(() => {
        if (active) {
          setSectionLabel("Not assigned");
          setGradeLevelLabel("Not assigned");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 px-3 shadow-md backdrop-blur sm:px-4 lg:px-6">
        <div className="flex h-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event("educassist-student-menu"))
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="hidden leading-tight lg:block">
                <span className="block text-xl font-extrabold text-slate-900">EducAssist</span>
                <span className="block -mt-1 text-[11px] text-slate-500">Student Portal</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center px-2 sm:px-4 lg:px-8">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
              {activePageTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4">
            <EventNotifications eventHref="/student/dashboard" />

            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 text-sm font-semibold text-slate-700"
                onClick={() => setShowProfileMenu((v) => !v)}
                aria-label="Open profile menu"
              >
                {initials || "S"}
              </button>

              {showProfileMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                    <div className="px-4 pb-2 pt-3">
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500">Student</p>
                    </div>
                    <div className="border-t" />
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <UserCircle className="h-4 w-4" /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4" /> Settings
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
          <div className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-4 p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.08)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                {initials || "S"}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-xs text-slate-500">Student</p>
              </div>
              <X className="cursor-pointer text-slate-500 hover:text-black" onClick={() => setShowProfileModal(false)} />
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="text-xs font-medium text-slate-500">Display Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                  defaultValue={displayName}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Role</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  defaultValue="Student"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Grade Level</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  value={gradeLevelLabel}
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Section</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  value={sectionLabel}
                  readOnly
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 shadow-[0_-1px_0_0_rgba(15,23,42,0.08)]">
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showSettingsModal ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
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
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
