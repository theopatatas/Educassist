"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import EventNotifications from "../EventNotifications";

type HeaderProfile = {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
};

const titles: Record<string, string> = {
  "/staff-admin/dashboard": "Dashboard",
  "/staff-admin/students": "Student Management",
  "/staff-admin/events": "Meetings & Events",
  "/staff-admin/reports": "Reports",
  "/staff-admin/profile": "Profile",
  "/staff-admin/settings": "Settings",
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function StaffAdminHeader({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void api
      .get("/api/users/me")
      .then(({ data }) => {
        if (active) setProfile(data?.user ?? null);
      })
      .catch(() => undefined);
    const updateProfile = (event: Event) => {
      const detail = (event as CustomEvent<HeaderProfile>).detail;
      if (detail) setProfile(detail);
    };
    window.addEventListener("educassist-profile-updated", updateProfile);
    return () => {
      active = false;
      window.removeEventListener("educassist-profile-updated", updateProfile);
    };
  }, []);

  const title =
    Object.entries(titles).find(
      ([path]) => pathname === path || pathname.startsWith(`${path}/`),
    )?.[1] ?? "Admin";
  const fallbackName = useMemo(() => {
    const local = user?.email?.split("@")[0]?.trim();
    return local
      ? local.charAt(0).toUpperCase() + local.slice(1)
      : "Administrator";
  }, [user?.email]);
  const displayName =
    profile?.displayName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    fallbackName;
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join("") || "A";
  const photoUrl = profile?.profilePhotoUrl
    ? `${apiBase}${profile.profilePhotoUrl}`
    : null;

  return (
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="hidden leading-tight lg:block">
              <span className="block text-xl font-extrabold text-slate-900">
                EducAssist
              </span>
              <span className="-mt-1 block text-[11px] text-slate-500">
                Admin Portal
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center px-2 sm:px-4 lg:px-8">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4">
          <EventNotifications eventHref="/staff-admin/events" />

          <div className="relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border bg-slate-100 bg-cover bg-center text-sm font-semibold text-slate-700"
              style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
              onClick={() => {
                setProfileMenuOpen((current) => !current);
              }}
              aria-label="Open profile menu"
            >
              {!photoUrl ? initials : null}
            </button>
            {profileMenuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileMenuOpen(false)}
                  aria-label="Close profile menu"
                />
                <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-white py-2 shadow-xl">
                  <div className="px-4 pb-2 pt-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500">Administrator</p>
                  </div>
                  <div className="border-t" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/staff-admin/profile");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                  >
                    <UserCircle className="h-4 w-4" /> My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/staff-admin/settings");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <div className="my-2 border-t" />
                  <button
                    type="button"
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
  );
}
