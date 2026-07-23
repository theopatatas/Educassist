"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  LogOut,
  Settings,
  UserCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { getLocal, setLocal } from "@/src/lib/storage/local";
import { api } from "@/src/lib/http/client";
import SuperAdminProfileModal from "./SuperAdminProfileModal";
import EventNotifications from "../EventNotifications";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/analytics": "Analytics",
  "/admin/teachers": "Teacher Management",
  "/admin/students": "Student Management",
  "/admin/subjects": "Subjects",
  "/admin/forms": "Forms",
  "/admin/reports": "Reports",
  "/admin/accounts": "Admin Accounts",
  "/admin/settings": "Settings",
};

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState<string>(
    () => getLocal<string>("educassist_admin_display_name") || "",
  );
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileAccess, setShowProfileAccess] = useState(false);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileAccessError, setProfileAccessError] = useState("");
  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const applyLogo = (logoUrl?: string | null) => {
      if (!logoUrl) return setSchoolLogoUrl(null);
      const backendBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      setSchoolLogoUrl(
        logoUrl.startsWith("http") ? logoUrl : `${backendBase}${logoUrl}`,
      );
    };
    void api
      .get("/api/admin/settings")
      .then(({ data }) => applyLogo(data?.settings?.branding?.logoUrl))
      .catch(() => undefined);
    const handleBranding = (event: Event) =>
      applyLogo(
        (event as CustomEvent<{ logoUrl?: string | null }>).detail?.logoUrl,
      );
    window.addEventListener("educassist-branding-updated", handleBranding);
    return () =>
      window.removeEventListener("educassist-branding-updated", handleBranding);
  }, []);

  useEffect(() => {
    void api
      .get("/api/users/me")
      .then(({ data }) => {
        const profile = data?.user;
        if (profile?.displayName) setDisplayName(profile.displayName);
        if (profile?.profilePhotoUrl) {
          const backendBase =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          setProfilePhotoUrl(`${backendBase}${profile.profilePhotoUrl}`);
        }
      })
      .catch(() => undefined);
  }, []);

  const fallbackDisplayName = useMemo(() => {
    const email = user?.email || "";
    const local = email.split("@")[0]?.trim();
    if (!local) return "Super Admin";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [user?.email]);

  const activeDisplayName = displayName.trim() || fallbackDisplayName;

  const initials = activeDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const activePageTitle =
    Object.entries(pageTitles).find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] || "Super Admin";

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 px-3 shadow-md backdrop-blur sm:px-4 lg:px-6">
        <div className="flex h-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 bg-contain bg-center bg-no-repeat text-white"
                style={
                  schoolLogoUrl
                    ? {
                        backgroundImage: `url(${schoolLogoUrl})`,
                        backgroundColor: "white",
                      }
                    : undefined
                }
                role="img"
                aria-label={
                  schoolLogoUrl ? "School logo" : "EducAssist Super Admin"
                }
              >
                {!schoolLogoUrl ? <ShieldCheck className="h-5 w-5" /> : null}
              </div>
              <div className="hidden leading-tight lg:block">
                <span className="block text-xl font-extrabold text-slate-900">
                  EducAssist
                </span>
                <span className="block -mt-1 text-[11px] text-slate-500">
                  Super Admin Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center px-2 sm:px-4 lg:px-8">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
              {activePageTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4">
            <EventNotifications eventHref="/admin/dashboard" />

            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 bg-cover bg-center text-sm font-semibold text-slate-700"
                style={
                  profilePhotoUrl
                    ? { backgroundImage: `url(${profilePhotoUrl})` }
                    : undefined
                }
                onClick={() => setShowProfileMenu((v) => !v)}
                aria-label="Open profile menu"
              >
                {!profilePhotoUrl ? initials || "A" : null}
              </button>

              {showProfileMenu ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                    <div className="px-4 pb-2 pt-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {activeDisplayName}
                      </p>
                      <p className="text-xs text-slate-500">Super Admin</p>
                    </div>
                    <div className="border-t" />
                    <button
                      onClick={() => {
                        setShowProfileAccess(true);
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
        <SuperAdminProfileModal
          onClose={() => setShowProfileModal(false)}
          onUpdated={(profile) => {
            const nextDisplayName =
              profile.displayName?.trim() || activeDisplayName;
            setDisplayName(nextDisplayName);
            setLocal("educassist_admin_display_name", nextDisplayName);
            const backendBase =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            setProfilePhotoUrl(
              profile.profilePhotoUrl
                ? `${backendBase}${profile.profilePhotoUrl}`
                : null,
            );
          }}
        />
      ) : null}

      {showProfileAccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!profilePassword || verifyingProfile) return;
              setVerifyingProfile(true);
              setProfileAccessError("");
              try {
                await api.post("/api/auth/verify-password", {
                  password: profilePassword,
                });
                setShowProfileAccess(false);
                setProfilePassword("");
                setShowProfileModal(true);
              } catch (error) {
                const value = error as {
                  response?: { data?: { message?: string } };
                };
                setProfileAccessError(
                  value.response?.data?.message ||
                    "Password verification failed.",
                );
              } finally {
                setVerifyingProfile(false);
              }
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Verify Profile Access
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your Super Admin password before opening My Profile.
            </p>
            <label className="mt-5 block text-sm font-medium text-slate-600">
              Super Admin Password
              <input
                type="password"
                value={profilePassword}
                onChange={(event) => {
                  setProfilePassword(event.target.value);
                  setProfileAccessError("");
                }}
                autoComplete="current-password"
                autoFocus
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {profileAccessError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {profileAccessError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileAccess(false);
                  setProfilePassword("");
                  setProfileAccessError("");
                }}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!profilePassword || verifyingProfile}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
              >
                {verifyingProfile ? "Verifying…" : "Open Profile"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showSettingsModal ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-bold">Settings</h2>
              <X
                className="cursor-pointer text-slate-500 hover:text-black"
                onClick={() => setShowSettingsModal(false)}
              />
            </div>
            <div className="space-y-5 p-5">
              <p className="text-sm text-slate-600">
                Settings panel is ready for Super Admin options.
              </p>
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
