"use client";

import { useAcademicContext } from "@/src/features/academic/useAcademicContext";

export default function AcademicPeriodBadge() {
  const academic = useAcademicContext();
  const schoolYear =
    academic?.currentSchoolYear || "Academic year unavailable";
  const term = academic?.currentTerm || "Term unavailable";
  return (
    <div className="max-w-[10rem] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-right sm:max-w-none sm:px-3">
      <p className="truncate text-[11px] font-semibold text-slate-700 sm:text-xs">
        {schoolYear}
      </p>
      <p className="truncate text-[11px] text-slate-500 sm:text-xs">
        {term}
      </p>
    </div>
  );
}
