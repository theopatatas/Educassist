"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import SessionIdleManager from "@/src/features/auth/SessionIdleManager";
import StudentHeader from "./StudentHeader";
import AICompanion from "./_components/AICompanion";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user) return null;

  const showBaseHeader = user.role === "student";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SessionIdleManager />
      {showBaseHeader ? (
        <>
          <StudentHeader />
          <main className="p-6">{children}</main>
        </>
      ) : (
        <main>{children}</main>
      )}
      <AICompanion />
    </div>
  );
}
