"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, UserSquare2 } from "lucide-react";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, iconColor: "text-blue-500" },
  { href: "/admin/students", label: "Student", icon: GraduationCap, iconColor: "text-green-500" },
  { href: "/admin/teachers", label: "Teacher", icon: UserSquare2, iconColor: "text-orange-500" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:flex">
      <div className="w-full space-y-1 p-4">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Menu</p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={`rounded-lg p-2 ${active ? "bg-white shadow-sm" : ""}`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
