"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import StudentSidebar from "./StudentSidebar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated } = useAuth();
  const [graduated, setGraduated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    if (user.role !== "student") router.replace("/unauthorized");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!hydrated || !user || user.role !== "student") return;
    let active = true;
    api
      .get("/api/students/me")
      .then(({ data }) => {
        if (!active) return;
        const isGraduated = Boolean(data?.student?.graduatedAt);
        setGraduated(isGraduated);
        if (isGraduated && pathname !== "/student/grade-portal") {
          router.replace("/student/grade-portal");
        }
      })
      .catch(() => {
        if (active) setGraduated(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, pathname, router, user]);

  if (!hydrated) return null;
  if (!user || user.role !== "student" || graduated === null) return null;

  return (
    <div className="flex">
      <StudentSidebar graduated={graduated} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
