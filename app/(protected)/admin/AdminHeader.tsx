"use client";

import { useMemo, useState } from "react";
import { Bell, Menu, LogOut, Settings, UserCircle, X, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { getLocal, setLocal } from "@/src/lib/storage/local";

type Notice = { id: number; title: string; time: string; read: boolean };

export default function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState<string>(() => getLocal<string>("educassist_admin_display_name") || "");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notifications, setNotifications] = useState<Notice[]>([]);

  const fallbackDisplayName = useMemo(() => {
    const email = user?.email || "";
    const local = email.split("@")[0]?.trim();
    if (!local) return "Admin";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [user?.email]);

  const activeDisplayName = displayName.trim() || fallbackDisplayName;

  const persistDisplayName = () => {
    const trimmed = displayName.trim() || fallbackDisplayName;
    setDisplayName(trimmed);
    setLocal("educassist_admin_display_name", trimmed);
  };

  const initials = activeDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 px-6 shadow-md backdrop-blur">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-4">
            <Menu className="h-6 w-6 text-slate-500 md:hidden" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xl font-extrabold text-slate-900">EducAssist</span>
                <span className="block -mt-1 text-[11px] text-slate-500">Admin Portal</span>
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
                      {unreadCount > 0 ? (
                        <span className="text-xs text-slate-500">{unreadCount} unread</span>
                      ) : null}
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
                            {!n.read ? (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
                            ) : null}
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
                {initials || "A"}
              </button>

              {showProfileMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                    <div className="px-4 pb-2 pt-3">
                      <p className="text-sm font-semibold text-slate-900">{activeDisplayName}</p>
                      <p className="text-xs text-slate-500">Admin</p>
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
                {initials || "A"}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{activeDisplayName}</h2>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
              <X className="cursor-pointer text-slate-500 hover:text-black" onClick={() => setShowProfileModal(false)} />
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="text-xs font-medium text-slate-500">Display Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-border focus:ring-2 focus:ring-slate-200"
                  value={displayName || activeDisplayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={persistDisplayName}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Role</label>
                <input
                  disabled
                  className="mt-1 w-full rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm"
                  defaultValue="Admin"
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
          <div className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-bold">Settings</h2>
              <X className="cursor-pointer text-slate-500 hover:text-black" onClick={() => setShowSettingsModal(false)} />
            </div>
            <div className="space-y-5 p-5">
              <p className="text-sm text-slate-600">Settings panel is ready for admin options.</p>
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
