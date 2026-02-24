"use client";

import Link from "next/link";
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
  { id: "dashboard", label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { id: "classes", label: "Classes", href: "/student/classes", icon: BookOpen, color: "text-green-500" },
  { id: "quiz", label: "Quiz Center", href: "/student/quiz-center", icon: BrainCircuit, color: "text-orange-500" },
  { id: "exam", label: "Exam Hall", href: "/student/exam-hall", icon: FileText, color: "text-red-500" },
  { id: "assignments", label: "Assignment", href: "/student/assignment", icon: ScrollText, color: "text-pink-500" },
  { id: "grades", label: "Grade Portal", href: "/student/grade-portal", icon: GraduationCap, color: "text-amber-500" },
  { id: "attendance", label: "Attendance", href: "/student/attendance", icon: ClipboardCheck, color: "text-teal-500" },
  { id: "reports", label: "Reports", href: "/student/reports", icon: BarChart3, color: "text-indigo-500" },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:flex md:flex-col">
      <div className="space-y-1 p-4">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Menu</p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`rounded-lg p-2 ${isActive ? "bg-white shadow-sm" : ""}`}>
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
