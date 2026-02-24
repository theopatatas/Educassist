"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import TeacherHeader from "./TeacherHeader";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    if (user.role !== "teacher") router.replace("/unauthorized");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user || user.role !== "teacher") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
