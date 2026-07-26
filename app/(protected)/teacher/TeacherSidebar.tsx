"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  FileText,
  ScrollText,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  CalendarOff,
  X,
} from "lucide-react";

const menuItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { href: "/teacher/classes", label: "Classes", icon: BookOpen, color: "text-green-500" },
  { href: "/teacher/quiz-center", label: "Quiz Center", icon: BrainCircuit, color: "text-orange-500" },
  { href: "/teacher/exam-hall", label: "Exam Schedule", icon: FileText, color: "text-red-500" },
  { href: "/teacher/assignment", label: "Assignment", icon: ScrollText, color: "text-pink-500" },
  { href: "/teacher/grade-portal", label: "Grade Portal", icon: GraduationCap, color: "text-amber-500" },
  { href: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck, color: "text-teal-500" },
  { href: "/teacher/leave-requests", label: "Leave Requests", icon: CalendarOff, color: "text-violet-500" },
  { href: "/teacher/reports", label: "Reports", icon: BarChart3, color: "text-indigo-500" },
];

type TeacherSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function TeacherSidebar({
  open,
  onClose,
}: TeacherSidebarProps) {
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
              Teacher Menu
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

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`rounded-lg p-2 ${active ? "bg-white shadow-sm" : ""}`}
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
