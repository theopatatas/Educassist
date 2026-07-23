"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  UserSquare2,
  BookOpenText,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
  ChartNoAxesCombined,
} from "lucide-react";

const items = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: ChartNoAxesCombined,
    iconColor: "text-blue-500",
  },
  {
    href: "/admin/teachers",
    label: "Teacher Management",
    icon: UserSquare2,
    iconColor: "text-orange-500",
  },
  {
    href: "/admin/students",
    label: "Student Management",
    icon: GraduationCap,
    iconColor: "text-green-500",
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    icon: BookOpenText,
    iconColor: "text-violet-500",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    iconColor: "text-amber-500",
  },
  {
    href: "/admin/accounts",
    label: "Admin Accounts",
    icon: ShieldCheck,
    iconColor: "text-rose-500",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    iconColor: "text-slate-500",
  },
];

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] shrink-0 overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 md:sticky md:top-16 md:z-20 md:h-[calc(100vh-4rem)] md:w-64 md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="w-full space-y-1 p-4">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Super Admin Menu
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`rounded-lg p-2 ${active ? "bg-white shadow-sm" : ""}`}
                >
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
