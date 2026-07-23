"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import StaffAdminHeader from "./StaffAdminHeader";
import StaffAdminSidebar from "./StaffAdminSidebar";

export default function StaffAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (hydrated && (!user || user.role !== "admin"))
      router.replace("/unauthorized");
  }, [hydrated, router, user]);
  if (!hydrated || !user || user.role !== "admin") return null;
  return (
    <div className="min-h-screen bg-slate-50">
      <StaffAdminHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex">
        <StaffAdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
