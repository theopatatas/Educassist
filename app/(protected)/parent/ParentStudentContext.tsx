"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/src/lib/http/client";
import { useAuth } from "@/src/features/auth/hooks";

export type LinkedParentStudent = {
  id: number;
  name: string;
  gradeLevel: string | null;
  sectionId: number | null;
  sectionName: string | null;
  graduated: boolean;
  archived: boolean;
  primary: boolean;
};

type ParentStudentContextValue = {
  students: LinkedParentStudent[];
  selectedStudent: LinkedParentStudent | null;
  selectedStudentId: number | null;
  loading: boolean;
  error: string;
  selectStudent: (studentId: number) => void;
  refreshStudents: () => Promise<void>;
};

const ParentStudentContext =
  createContext<ParentStudentContextValue | null>(null);

export function ParentStudentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [students, setStudents] = useState<LinkedParentStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storageKey = `educassist_parent_selected_student_${String(user?.id ?? "guest")}`;

  const refreshStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/parents/students");
      const rows = Array.isArray(data?.students)
        ? (data.students as LinkedParentStudent[])
        : [];
      const savedId = Number(window.localStorage.getItem(storageKey));
      const selected =
        rows.find((student) => student.id === savedId) ??
        rows.find((student) => student.primary) ??
        rows[0] ??
        null;
      setStudents(rows);
      setSelectedStudentId(selected?.id ?? null);
      if (selected)
        window.localStorage.setItem(storageKey, String(selected.id));
    } catch {
      setStudents([]);
      setSelectedStudentId(null);
      setError("Linked students could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    void refreshStudents();
  }, [refreshStudents]);

  const selectStudent = useCallback(
    (studentId: number) => {
      if (!students.some((student) => student.id === studentId)) return;
      setSelectedStudentId(studentId);
      window.localStorage.setItem(storageKey, String(studentId));
    },
    [storageKey, students],
  );

  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;
  const value = useMemo(
    () => ({
      students,
      selectedStudent,
      selectedStudentId,
      loading,
      error,
      selectStudent,
      refreshStudents,
    }),
    [
      error,
      loading,
      refreshStudents,
      selectStudent,
      selectedStudent,
      selectedStudentId,
      students,
    ],
  );

  return (
    <ParentStudentContext.Provider value={value}>
      {children}
    </ParentStudentContext.Provider>
  );
}

export function useParentStudent() {
  const value = useContext(ParentStudentContext);
  if (!value)
    throw new Error(
      "useParentStudent must be used inside ParentStudentProvider",
    );
  return value;
}
