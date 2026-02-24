"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import StudentSidebar from "./StudentSidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    if (user.role !== "student") router.replace("/unauthorized");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user || user.role !== "student") return null;

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
