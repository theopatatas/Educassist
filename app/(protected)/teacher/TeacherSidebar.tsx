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
} from "lucide-react";

const menuItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { href: "/teacher/classes", label: "Classes", icon: BookOpen, color: "text-green-500" },
  { href: "/teacher/quiz-center", label: "Quiz Center", icon: BrainCircuit, color: "text-orange-500" },
  { href: "/teacher/exam-hall", label: "Exam Hall", icon: FileText, color: "text-red-500" },
  { href: "/teacher/assignment", label: "Assignment", icon: ScrollText, color: "text-pink-500" },
  { href: "/teacher/grade-portal", label: "Grade Portal", icon: GraduationCap, color: "text-amber-500" },
  { href: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck, color: "text-teal-500" },
  { href: "/teacher/reports", label: "Reports", icon: BarChart3, color: "text-indigo-500" },
];

export default function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:flex">
      <div className="w-full space-y-1 p-4">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Menu</p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={`rounded-lg p-2 ${active ? "bg-white shadow-sm" : ""}`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
