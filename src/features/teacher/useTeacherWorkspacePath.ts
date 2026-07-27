"use client";

import { usePathname } from "next/navigation";

export function useTeacherWorkspacePath() {
  const pathname = usePathname();
  const takeover = pathname.match(
    /^(\/admin\/leave-management\/\d+\/workspace)(?:\/|$)/,
  );
  const basePath = takeover?.[1] ?? "/teacher";
  const workspacePath = (path: string) =>
    `${basePath}/${path.replace(/^\/?(?:teacher\/)?/, "")}`.replace(/\/+$/, "");
  return { workspacePath, isTakeover: Boolean(takeover) };
}
