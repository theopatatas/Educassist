"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import TeacherHeader from "./TeacherHeader";
import TeacherSidebar from "./TeacherSidebar";
import {
  isTeacherTextControl,
  sanitizeTeacherSentence,
} from "@/src/lib/utils/teacherInput";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    if (user.role !== "teacher") router.replace("/unauthorized");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user || user.role !== "teacher") return null;

  const sanitizeTeacherInput = (event: FormEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!isTeacherTextControl(target)) return;
    if (target.dataset.allowUnrestricted === "true") return;
    const sanitized = sanitizeTeacherSentence(target.value);
    if (target.value !== sanitized) target.value = sanitized;
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      onChangeCapture={sanitizeTeacherInput}
    >
      <TeacherHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex">
        <TeacherSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
