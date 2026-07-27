"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import {
  isTeacherTextControl,
  sanitizeTeacherSentence,
} from "@/src/lib/utils/teacherInput";
import TeacherHeader from "../../../../teacher/TeacherHeader";
import TeacherSidebar from "../../../../teacher/TeacherSidebar";

type WorkspaceIdentity = {
  leave?: {
    teacher?: { name?: string | null } | null;
  };
  classes?: Array<{ classId: number }>;
};

export default function ActiveTakeoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceIdentity | null>(null);
  const basePath = `/admin/leave-management/${params.id}/workspace`;

  useEffect(() => {
    if (!hydrated) return;
    if (!user || user.role !== "super_admin") {
      router.replace("/unauthorized");
      return;
    }
    api
      .get(`/api/leaves/admin/${params.id}/workspace`)
      .then(({ data }) => setWorkspace(data?.workspace ?? null))
      .catch(() => router.replace("/admin/leave-management"));
  }, [hydrated, params.id, router, user]);

  if (!hydrated || !user || user.role !== "super_admin") return null;

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
      <TeacherHeader
        onMenuClick={() => setSidebarOpen(true)}
        basePath={basePath}
        takeover
      />
      <div className="border-b border-violet-200 bg-violet-50 px-3 py-2.5 sm:px-5 lg:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm text-violet-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <p className="truncate">
              <b>Active Takeover:</b>{" "}
              {workspace?.leave?.teacher?.name || "Teacher"} ·{" "}
              {workspace?.classes?.length ?? 0} affected class
              {(workspace?.classes?.length ?? 0) === 1 ? "" : "es"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/leave-management"
              className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Leave Management
            </Link>
            <Link
              href="/admin/dashboard"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800"
            >
              <LogOut className="h-4 w-4" />
              Leave Takeover
            </Link>
          </div>
        </div>
      </div>
      <div className="flex">
        <TeacherSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          basePath={basePath}
          takeover
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
