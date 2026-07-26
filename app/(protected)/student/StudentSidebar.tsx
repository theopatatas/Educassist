"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BrainCircuit,
  FileText,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  ScrollText,
} from "lucide-react";

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
  },
  {
    id: "classes",
    label: "Classes",
    href: "/student/classes",
    icon: BookOpen,
    color: "text-green-500",
  },
  {
    id: "quiz",
    label: "Quiz Center",
    href: "/student/quiz-center",
    icon: BrainCircuit,
    color: "text-orange-500",
  },
  {
    id: "exam",
    label: "Exam Schedule",
    href: "/student/exam-hall",
    icon: FileText,
    color: "text-red-500",
  },
  {
    id: "assignments",
    label: "Assignment",
    href: "/student/assignment",
    icon: ScrollText,
    color: "text-pink-500",
  },
  {
    id: "grades",
    label: "Grade Portal",
    href: "/student/grade-portal",
    icon: GraduationCap,
    color: "text-amber-500",
  },
  {
    id: "attendance",
    label: "Attendance",
    href: "/student/attendance",
    icon: ClipboardCheck,
    color: "text-teal-500",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/student/reports",
    icon: BarChart3,
    color: "text-indigo-500",
  },
];

export default function StudentSidebar({
  graduated = false,
}: {
  graduated?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleMenuItems = graduated
    ? menuItems.filter((item) => item.id === "grades")
    : menuItems;

  useEffect(() => {
    const openMenu = () => setMobileOpen(true);
    window.addEventListener("educassist-student-menu", openMenu);
    return () =>
      window.removeEventListener("educassist-student-menu", openMenu);
  }, []);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-950/35 md:hidden"
        />
      ) : null}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-50 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:sticky md:h-[calc(100vh-4rem)] md:w-64 md:translate-x-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="space-y-1 p-4">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>

        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span
                className={`rounded-lg p-2 ${isActive ? "bg-white shadow-sm" : ""}`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
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
