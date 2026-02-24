"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Menu, LogOut, Settings, UserCircle, X, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";

type Notice = { id: number; title: string; time: string; read: boolean };

export default function TeacherHeader() {
  const router = useRouter();
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [notifications, setNotifications] = useState<Notice[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get("/api/teachers/me")
      .then(({ data }) => {
        if (!active) return;
        const first = data?.teacher?.firstName || "";
        const last = data?.teacher?.lastName || "";
        const name = `${first} ${last}`.trim();
        if (name) setTeacherName(name);
      })
      .catch(() => {
        if (active) setTeacherName("Teacher");
      });
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const initials = teacherName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update password.";
      setPasswordStatus(message);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 px-6 shadow-md backdrop-blur">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-4">
            <Menu className="h-6 w-6 text-slate-500 md:hidden" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xl font-extrabold text-slate-900">EducAssist</span>
                <span className="block -mt-1 text-[11px] text-slate-500">Teacher Portal</span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex" />

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative rounded-full p-2 hover:bg-slate-100"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                    <span className="sr-only">{unreadCount} unread notifications</span>
                  </>
                )}
              </button>

              {showNotifications ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b p-4 font-bold">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs text-slate-500">{unreadCount} unread</span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-slate-600">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`cursor-pointer p-4 text-sm hover:bg-slate-50 ${
                            !n.read ? "bg-slate-50" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-slate-800">{n.title}</span>
                            {!n.read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 text-sm font-semibold text-slate-700"
                onClick={() => setShowProfileMenu((v) => !v)}
                aria-label="Open profile menu"
              >
                {initials || "T"}
              </button>

              {showProfileMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                    <div className="px-4 pb-2 pt-3">
                      <p className="text-sm font-semibold text-slate-900">{teacherName}</p>
                      <p className="text-xs text-slate-500">Teacher</p>
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
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-4 p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.08)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                {initials || "T"}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{teacherName}</h2>
                <p className="text-xs text-slate-500">Teacher</p>
              </div>
              <X
                className="cursor-pointer text-slate-500 hover:text-black"
                onClick={() => setShowProfileModal(false)}
              />
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="text-xs font-medium text-slate-500">Full Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                  defaultValue={teacherName}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Role</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border bg-slate-100 px-4 py-2 text-sm"
                  defaultValue="Teacher"
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Change Password
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {showCurrentPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Update Password
                  </button>
                  {passwordStatus ? (
                    <p className="text-xs text-slate-600">{passwordStatus}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 shadow-[0_-1px_0_0_rgba(15,23,42,0.08)]">
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-slate-900 px-5 py-2 text-sm text-white hover:bg-slate-800">
                Save Changes
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showSettingsModal ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-bold">Settings</h2>
              <X
                className="cursor-pointer text-slate-500 hover:text-black"
                onClick={() => setShowSettingsModal(false)}
              />
            </div>
            <div className="space-y-5 p-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Notifications</h3>
                {["Email Notifications", "Class Announcements", "Deadline Reminders"].map((label) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700">{label}</span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked />
                      <div className="h-5 w-10 rounded-full bg-slate-200 transition peer-checked:bg-slate-900" />
                      <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-5" />
                    </label>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold">Appearance</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700">Dark Mode</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="h-5 w-10 rounded-full bg-slate-200 transition peer-checked:bg-slate-900" />
                    <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-5" />
                  </label>
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
              <button className="rounded-xl bg-slate-900 px-5 py-2 text-sm text-white hover:bg-slate-800">
                Save Settings
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
