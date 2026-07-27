"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import ParentHeader from "./ParentHeader";
import { ParentStudentProvider } from "./ParentStudentContext";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    if (user.role !== "parent") router.replace("/unauthorized");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user || user.role !== "parent") return null;

  return (
    <ParentStudentProvider>
      <div className="min-h-screen bg-slate-50">
        <ParentHeader />
        <main className="p-3 sm:p-6">{children}</main>
      </div>
    </ParentStudentProvider>
  );
}
