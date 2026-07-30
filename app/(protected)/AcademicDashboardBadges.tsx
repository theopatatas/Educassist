"use client";

import { useAcademicContext } from "@/src/features/academic/useAcademicContext";

export default function AcademicDashboardBadges() {
  const academic = useAcademicContext();
  const schoolYear =
    academic?.currentSchoolYear || "Academic year unavailable";
  const term = academic?.currentTerm || "Term unavailable";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-white px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
        <span className="truncate">{schoolYear}</span>
      </span>
      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-purple-50 to-white px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
        <span className="truncate">{term}</span>
      </span>
    </div>
  );
}
