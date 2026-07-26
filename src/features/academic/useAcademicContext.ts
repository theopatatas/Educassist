"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/http/client";

export type AcademicContext = {
  currentSchoolYear: string;
  currentSemester: string;
  currentQuarter: string;
  passingGrade: number | null;
  promotionPolicy: string;
  gradeEncodingStartDate: string;
  gradeEncodingDeadline: string;
  gradeEncodingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
  gradePublishingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
  lastUpdated: string | null;
};

export function useAcademicContext() {
  const [academic, setAcademic] = useState<AcademicContext | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/settings/academic-context");
      setAcademic(data?.academic ?? null);
    } catch {
      setAcademic(null);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("educassist-academic-updated", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("educassist-academic-updated", refresh);
    };
  }, [load]);

  return academic;
}
