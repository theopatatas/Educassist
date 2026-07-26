"use client";

import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { api } from "@/src/lib/http/client";
import {
  Download,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";

type StudentGrade = {
  id: number;
  name: string;
  math: number;
  science: number;
  english: number;
  filipino: number;
  mapeh: number;
  ap: number;
  tle: number;
  values: number;
};

const initialGrades: StudentGrade[] = [];

const SUBJECTS = [
  { key: "math", label: "Math" },
  { key: "science", label: "Science" },
  { key: "english", label: "English" },
  { key: "filipino", label: "Filipino" },
  { key: "mapeh", label: "MAPEH" },
  { key: "ap", label: "AP" },
  { key: "tle", label: "TLE" },
  { key: "values", label: "Values" },
] as const;

type SubjectKey = (typeof SUBJECTS)[number]["key"];
type Term = "1st Grading" | "2nd Grading" | "3rd Grading" | "4th Grading";
type TeacherClass = { id: number; name: string | null; gradeLevel: string | null; subjectName?: string | null };
type ApiStudent = { id: number; firstName: string; lastName: string };
type AcademicContext = {
  currentSchoolYear: string;
  currentQuarter: string;
  gradeEncodingQuarter: string;
  endOfSchoolYear: boolean;
  gradeEncodingStartDate: string;
  gradeEncodingDeadline: string;
  gradeEncodingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
  gradePublishingStatus: "OPEN" | "LOCKED" | "UNAVAILABLE";
};
type AcademicSession = {
  academicYear: string;
  gradeLevel: string;
  status: "Current" | "Completed";
};
const GRADE_FILTERS_STORAGE_KEY = "teacher-grade-portal-filters-v1";
const TERMS: Term[] = [
  "1st Grading",
  "2nd Grading",
  "3rd Grading",
  "4th Grading",
];

function termForQuarter(quarter: string): Term | null {
  const index = Number(quarter.replace(/\D/g, "")) - 1;
  return TERMS[index] ?? null;
}

function quarterForTerm(term: Term) {
  const index = TERMS.indexOf(term);
  return index >= 0 ? `Quarter ${index + 1}` : term;
}

const SUBJECT_NAME_MAP: Record<string, SubjectKey> = {
  Math: "math",
  Mathematics: "math",
  Science: "science",
  English: "english",
  Filipino: "filipino",
  MAPEH: "mapeh",
  Mapeh: "mapeh",
  AP: "ap",
  "Aralin Panlipunan": "ap",
  TLE: "tle",
  Values: "values",
  ESP: "values",
};

const clampGrade = (n: number) => Math.min(100, Math.max(0, n));

const getGradeColor = (grade: number) => {
  if (grade >= 95) return "bg-gray-100 text-gray-900 font-bold";
  if (grade >= 90) return "bg-gray-50 text-gray-900 font-semibold";
  if (grade >= 85) return "text-gray-700";
  if (grade >= 75) return "text-gray-600";
  return "bg-gray-100 text-gray-700 font-bold";
};

const calcAverage = (s: StudentGrade) =>
  Math.round((s.math + s.science + s.english + s.filipino + s.mapeh + s.ap + s.tle + s.values) / 8);

export default function TeacherGradePortalPage() {
  const [grades, setGrades] = useState<StudentGrade[]>(initialGrades);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    const raw = window.localStorage.getItem(GRADE_FILTERS_STORAGE_KEY);
    if (!raw) return "All Sections";
    try {
      const parsed = JSON.parse(raw) as { section?: string };
      return parsed.section || "All Sections";
    } catch {
      return "All Sections";
    }
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grades";
    const raw = window.localStorage.getItem(GRADE_FILTERS_STORAGE_KEY);
    if (!raw) return "All Grades";
    try {
      const parsed = JSON.parse(raw) as { grade?: string };
      return parsed.grade || "All Grades";
    } catch {
      return "All Grades";
    }
  });
  const [selectedSubject, setSelectedSubject] = useState<"all" | SubjectKey>(() => {
    if (typeof window === "undefined") return "all";
    const raw = window.localStorage.getItem(GRADE_FILTERS_STORAGE_KEY);
    if (!raw) return "all";
    try {
      const parsed = JSON.parse(raw) as { subject?: "all" | SubjectKey };
      return parsed.subject || "all";
    } catch {
      return "all";
    }
  });
  const [term, setTerm] = useState<Term>(() => {
    if (typeof window === "undefined") return "1st Grading";
    const raw = window.localStorage.getItem(GRADE_FILTERS_STORAGE_KEY);
    if (!raw) return "1st Grading";
    try {
      const parsed = JSON.parse(raw) as { term?: Term };
      return parsed.term || "1st Grading";
    } catch {
      return "1st Grading";
    }
  });
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "average">("name");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("Saved");
  const [isPublished, setIsPublished] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [academic, setAcademic] = useState<AcademicContext | null>(null);
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>(
    [],
  );
  const [selectedSession, setSelectedSession] =
    useState<AcademicSession | null>(null);

  useEffect(() => {
    let active = true;
    const loadAcademic = () =>
      api
        .get("/api/admin/settings/academic-context")
        .then(({ data }) => {
          if (!active) return;
          const context = data?.academic as AcademicContext;
          setAcademic(context);
          const activeTerm = termForQuarter(
            context?.gradeEncodingQuarter ?? "",
          );
          if (activeTerm) setTerm(activeTerm);
        })
        .catch(() => {
          if (active) setAcademic(null);
        });
    void loadAcademic();
    window.addEventListener("educassist-academic-updated", loadAcademic);
    return () => {
      active = false;
      window.removeEventListener("educassist-academic-updated", loadAcademic);
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/grades/me/sessions")
      .then(({ data }) => {
        if (!active) return;
        const sessions = Array.isArray(data?.sessions)
          ? (data.sessions as AcademicSession[])
          : [];
        setAcademicSessions(sessions);
        const current =
          sessions.find((session) => session.status === "Current") ??
          sessions[0] ??
          null;
        setSelectedSession(current);
        if (current) setSelectedGrade(current.gradeLevel);
      })
      .catch(() => {
        if (active) setAcademicSessions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.classes) ? (data.classes as TeacherClass[]) : [];
        setTeacherClasses(rows);
      })
      .catch(() => {
        if (active) setTeacherClasses([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2500);
  };

  const visibleSubjects = useMemo<Array<{ key: SubjectKey; label: string }>>(
    () =>
      selectedSubject === "all"
        ? SUBJECTS.map((s) => ({ key: s.key, label: s.label }))
        : SUBJECTS.filter((s) => s.key === selectedSubject).map((s) => ({ key: s.key, label: s.label })),
    [selectedSubject]
  );
  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const section = cls.name?.trim();
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [teacherClasses]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim();
      if (!grade || grade === "Not set") continue;
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, grade);
    }
    for (const session of academicSessions) {
      const grade = session.gradeLevel.trim();
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (grade && !uniq.has(key)) uniq.set(key, grade);
    }
    return ["All Grades", ...Array.from(uniq.values())];
  }, [academicSessions, teacherClasses]);
  const subjectOptions = useMemo(
    () => ["all", ...SUBJECTS.map((s) => s.key)] as Array<"all" | SubjectKey>,
    []
  );
  const effectiveSection = useMemo(() => {
    if (selectedSection !== "All Sections" && sectionOptions.includes(selectedSection)) return selectedSection;
    return sectionOptions[1] ?? "All Sections";
  }, [sectionOptions, selectedSection]);
  const effectiveGrade = useMemo(() => {
    if (selectedGrade !== "All Grades" && gradeOptions.includes(selectedGrade)) return selectedGrade;
    return gradeOptions[1] ?? "All Grades";
  }, [gradeOptions, selectedGrade]);
  const isHistoricalSession = selectedSession?.status === "Completed";
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GRADE_FILTERS_STORAGE_KEY,
      JSON.stringify({
        section: selectedSection,
        grade: selectedGrade,
        subject: selectedSubject,
        term,
      })
    );
  }, [selectedSection, selectedGrade, selectedSubject, term]);

  const filteredTeacherClasses = useMemo(
    () =>
      teacherClasses.filter((cls) => {
        const section = cls.name?.trim() || "";
        const grade = cls.gradeLevel?.trim() || "";
        const sectionMatch = effectiveSection === "All Sections" || section === effectiveSection;
        const gradeMatch = effectiveGrade === "All Grades" || grade === effectiveGrade;
        return sectionMatch && gradeMatch;
      }),
    [effectiveGrade, effectiveSection, teacherClasses]
  );
  const editableSubjectKeys = useMemo(() => {
    const keys = new Set<SubjectKey>();
    for (const cls of filteredTeacherClasses) {
      const name = cls.subjectName?.trim();
      if (!name) continue;
      const key = SUBJECT_NAME_MAP[name];
      if (key) keys.add(key);
    }
    return keys;
  }, [filteredTeacherClasses]);
  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setIsStudentsLoading(true);
    }, 0);
    Promise.all(
      filteredTeacherClasses.map(async (cls) => {
        try {
          const res = await api.get(`/api/classes/${cls.id}/students`);
          return Array.isArray(res.data?.students) ? (res.data.students as ApiStudent[]) : [];
        } catch {
          return [];
        }
      })
    )
      .then((rows) => {
        if (!active) return;
        const unique = new Map<number, ApiStudent>();
        for (const group of rows) {
          for (const student of group) unique.set(student.id, student);
        }
        const sorted = Array.from(unique.values()).sort((a, b) =>
          `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
        );
        setGrades(
          sorted.map((student) => ({
            id: student.id,
            name: `${student.lastName}, ${student.firstName}`,
            math: 0,
            science: 0,
            english: 0,
            filipino: 0,
            mapeh: 0,
            ap: 0,
            tle: 0,
            values: 0,
          }))
        );
      })
      .finally(() => {
        if (active) setIsStudentsLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [filteredTeacherClasses, selectedSession?.academicYear]);
  useEffect(() => {
    if (effectiveSection === "All Sections" || effectiveGrade === "All Grades") {
      return;
    }
    if (grades.length === 0 && !isHistoricalSession) {
      return;
    }

    let active = true;
    const loadSubject = (subject: SubjectKey) =>
      api.get("/api/classes/grades/me", {
        params: {
          section: effectiveSection,
          gradeLevel: effectiveGrade,
          subject,
          term,
          academicYear: selectedSession?.academicYear,
        },
      });

    if (selectedSubject === "all") {
      const subjectsToLoad = SUBJECTS.map((s) => s.key);
      Promise.all(subjectsToLoad.map((subject) => loadSubject(subject).then(({ data }) => ({ subject, data }))))
        .then((results) => {
          if (!active) return;
          const scoreMaps = new Map<SubjectKey, Map<number, number>>();
          const publishedBySubject = new Map<SubjectKey, boolean>();
          for (const result of results) {
            const rows = Array.isArray(result.data?.rows)
              ? (result.data.rows as Array<{ studentId: number; score: number }>)
              : [];
            const scoreByStudentId = new Map<number, number>();
            for (const row of rows) {
              scoreByStudentId.set(Number(row.studentId), Number(row.score) || 0);
            }
            scoreMaps.set(result.subject, scoreByStudentId);
            publishedBySubject.set(result.subject, Boolean(result.data?.published));
          }
          setGrades((prev) => {
            const historicalStudents = new Map<number, string>();
            for (const result of results) {
              const rows = Array.isArray(result.data?.rows)
                ? (result.data.rows as Array<{
                    studentId: number;
                    studentName?: string;
                  }>)
                : [];
              for (const row of rows)
                historicalStudents.set(
                  Number(row.studentId),
                  row.studentName || "Student",
                );
            }
            const base = isHistoricalSession
              ? Array.from(historicalStudents, ([id, name]) => ({
                  id,
                  name,
                  math: 0,
                  science: 0,
                  english: 0,
                  filipino: 0,
                  mapeh: 0,
                  ap: 0,
                  tle: 0,
                  values: 0,
                }))
              : prev;
            return base.map((student) => {
              const next = { ...student };
              for (const subject of subjectsToLoad) {
                next[subject] = scoreMaps.get(subject)?.get(student.id) ?? 0;
              }
              return next;
            });
          });
          const teacherSubjects = Array.from(editableSubjectKeys);
          setIsPublished(
            teacherSubjects.length > 0 &&
              teacherSubjects.every((subject) => publishedBySubject.get(subject) === true)
          );
        })
        .catch(() => {
          if (!active) return;
          setIsPublished(false);
        });
    } else {
      loadSubject(selectedSubject)
        .then(({ data }) => {
          if (!active) return;
          const rows = Array.isArray(data?.rows)
            ? (data.rows as Array<{ studentId: number; score: number }>)
            : [];
          const scoreByStudentId = new Map<number, number>();
          for (const row of rows) {
            scoreByStudentId.set(Number(row.studentId), Number(row.score) || 0);
          }
          setGrades((prev) => {
            const base =
              isHistoricalSession && rows.length
                ? rows.map((row) => ({
                    id: Number(row.studentId),
                    name:
                      (
                        row as {
                          studentName?: string;
                        }
                      ).studentName || "Student",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                  }))
                : prev;
            return base.map((student) => ({
              ...student,
              [selectedSubject]: scoreByStudentId.get(student.id) ?? 0,
            }));
          });
          setIsPublished(Boolean(data?.published));
        })
        .catch(() => {
          if (!active) return;
          setIsPublished(false);
        });
    }
    return () => {
      active = false;
    };
  }, [editableSubjectKeys, effectiveGrade, effectiveSection, grades.length, isHistoricalSession, selectedSession?.academicYear, selectedSubject, term]);

  const calcVisibleAverage = useCallback((s: StudentGrade) => {
    if (visibleSubjects.length === 0) return 0;
    const total = visibleSubjects.reduce((sum, subject) => sum + Number(s[subject.key]), 0);
    return Math.round(total / visibleSubjects.length);
  }, [visibleSubjects]);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = grades.filter((s) => (q ? s.name.toLowerCase().includes(q) : true));
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return calcVisibleAverage(a) - calcVisibleAverage(b);
    });
    return list;
  }, [calcVisibleAverage, grades, query, sortBy]);
  const activeTerm = academic
    ? termForQuarter(academic.gradeEncodingQuarter)
    : null;
  const isActiveTerm = Boolean(activeTerm && term === activeTerm);
  const encodingOpen =
    academic?.gradeEncodingStatus === "OPEN" &&
    academic.gradePublishingStatus === "OPEN";
  const canEditGrades =
    !isHistoricalSession && isActiveTerm && encodingOpen && !isPublished;

  const dashboard = useMemo(() => {
    if (filteredAndSorted.length === 0) {
      return {
        classAverage: 0,
        highestAverage: 0,
        lowestAverage: 0,
        atRiskCount: 0,
        subjectAverages: SUBJECTS.map((s) => ({ key: s.key, label: s.label, value: 0 })),
      };
    }

    const averages = filteredAndSorted.map(calcVisibleAverage);
    const classAverage = Math.round(averages.reduce((sum, n) => sum + n, 0) / averages.length);
    const highestAverage = Math.max(...averages);
    const lowestAverage = Math.min(...averages);
    const atRiskCount = averages.filter((n) => n < 75).length;

    const subjectAverages = visibleSubjects.map((subject) => {
      const total = filteredAndSorted.reduce((sum, student) => sum + student[subject.key], 0);
      return {
        key: subject.key,
        label: subject.label,
        value: Math.round(total / filteredAndSorted.length),
      };
    });

    return {
      classAverage,
      highestAverage,
      lowestAverage,
      atRiskCount,
      subjectAverages,
    };
  }, [calcVisibleAverage, filteredAndSorted, visibleSubjects]);

  const handleGradeChange = (id: number, subject: SubjectKey, value: string) => {
    const numValue = clampGrade(Number.parseInt(value, 10) || 0);
    setGrades((prev) =>
      prev.map((student) =>
        student.id === id
          ? {
              ...student,
              [subject]: numValue,
            }
          : student
      )
    );
  };

  const saveGrades = (publish: boolean) => {
    if (effectiveSection === "All Sections" || effectiveGrade === "All Grades") {
      flashToast("Select section and grade before publishing");
      return;
    }
    if (!isActiveTerm) {
      flashToast(
        `Only ${academic?.gradeEncodingQuarter || "the open encoding quarter"} can be edited`,
      );
      return;
    }
    if (!encodingOpen) {
      flashToast("Grade encoding is currently locked");
      return;
    }
    if (isPublished) {
      flashToast("Published grades are locked");
      return;
    }
    if (selectedSubject === "all") {
      const subjectsToSave = Array.from(editableSubjectKeys);
      if (subjectsToSave.length === 0) {
        flashToast("No editable subjects found for selected filters");
        return;
      }
      Promise.all(
        subjectsToSave.map((subject) =>
          api.post("/api/classes/grades/me", {
            section: effectiveSection,
            gradeLevel: effectiveGrade,
            subject,
            term,
            publish,
            rows: filteredAndSorted.map((row) => ({
              studentId: row.id,
              score: Number(row[subject]),
            })),
          })
        )
      )
        .then(() => {
          setIsPublished(publish);
          flashToast(
            publish ? "Grades published for all subjects" : "Draft grades saved for all subjects"
          );
        })
        .catch((error: unknown) => {
          const requestError = error as {
            response?: { data?: { message?: string } };
          };
          flashToast(
            requestError.response?.data?.message ||
              "Failed to save grades for all subjects",
          );
        });
      return;
    }
    if (!editableSubjectKeys.has(selectedSubject)) {
      flashToast("You can only save grades for subjects you teach");
      return;
    }

    const rows = filteredAndSorted.map((row) => ({
      studentId: row.id,
      score: Number(row[selectedSubject]),
    }));
    api
      .post("/api/classes/grades/me", {
        section: effectiveSection,
        gradeLevel: effectiveGrade,
        subject: selectedSubject,
        term,
        publish,
        rows,
      })
      .then(() => {
        setIsPublished(publish);
        flashToast(publish ? "Grades published to students" : "Draft grades saved");
      })
      .catch((error: unknown) => {
        const requestError = error as {
          response?: { data?: { message?: string } };
        };
        flashToast(
          requestError.response?.data?.message || "Failed to save grades",
        );
      });
  };

  const handleExport = () => {
    const header = [
      "Section",
      "Term",
      "Name",
      "Math",
      "Science",
      "English",
      "Filipino",
      "MAPEH",
      "AP",
      "TLE",
      "Values",
      "Average",
      "Status",
    ].join(",");

    const rows = grades.map((g) => {
      const avg = calcAverage(g);
      const status = isPublished ? "Published" : "Draft";
      return `${effectiveSection},${term},"${g.name}",${g.math},${g.science},${g.english},${g.filipino},${g.mapeh},${g.ap},${g.tle},${g.values},${avg},${status}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teacher_gradebook_${effectiveSection}_${term}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    flashToast("Exported CSV");
  };

  return (
    <div className="relative mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Gradebook</h1>
          <p className="text-gray-500">
            Manage and record student grades • {quarterForTerm(term)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label className="block text-sm font-semibold text-slate-700">
            Academic Session
            <select
              value={
                selectedSession
                  ? `${selectedSession.academicYear}|${selectedSession.gradeLevel}`
                  : ""
              }
              onChange={(event) => {
                const session = academicSessions.find(
                  (item) =>
                    `${item.academicYear}|${item.gradeLevel}` ===
                    event.target.value,
                );
                if (!session) return;
                setSelectedSession(session);
                setSelectedGrade(session.gradeLevel);
                setGrades([]);
              }}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-md"
            >
              {academicSessions.length ? (
                academicSessions.map((session) => (
                  <option
                    key={`${session.academicYear}-${session.gradeLevel}`}
                    value={`${session.academicYear}|${session.gradeLevel}`}
                  >
                    {session.gradeLevel} • Academic Year{" "}
                    {session.academicYear} • {session.status}
                  </option>
                ))
              ) : (
                <option value="">No academic sessions available</option>
              )}
            </select>
          </label>
          {isHistoricalSession ? (
            <p className="mt-2 text-sm font-medium text-amber-700">
              Completed academic sessions are read-only.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <div>
            <p className="text-sm text-indigo-600">Academic Year</p>
            <p className="font-semibold text-slate-900">
              {selectedSession?.academicYear ||
                academic?.currentSchoolYear ||
                "Not configured"}
            </p>
          </div>
          <div>
            <p className="text-sm text-indigo-600">Active Quarter</p>
            <p className="font-semibold text-slate-900">
              {academic?.currentQuarter || "Not configured"}
            </p>
          </div>
          <div>
            <p className="text-sm text-indigo-600">Encoding Deadline</p>
            <p className="font-semibold text-slate-900">
              {academic?.gradeEncodingDeadline
                ? new Date(
                    `${academic.gradeEncodingDeadline}T00:00:00`,
                  ).toLocaleDateString()
                : "Unavailable"}
            </p>
          </div>
          <div>
            <p className="text-sm text-indigo-600">Encoding Status</p>
            <p
              className={`font-semibold ${
                encodingOpen ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {encodingOpen ? "Open" : "Locked"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="mb-4 text-sm font-semibold text-slate-700">
            Grade Filters
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative min-w-0">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as "all" | SubjectKey)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjectOptions.map((subjectKey) => (
                <option key={subjectKey} value={subjectKey}>
                  {subjectKey === "all" ? "All Subjects" : SUBJECTS.find((s) => s.key === subjectKey)?.label || subjectKey}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0">
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as Term)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TERMS.map((gradingTerm, index) => {
                const activeIndex = activeTerm
                  ? TERMS.indexOf(activeTerm)
                  : -1;
                return (
                  <option
                    key={gradingTerm}
                    value={gradingTerm}
                    disabled={
                      !isHistoricalSession &&
                      activeIndex >= 0 &&
                      index > activeIndex
                    }
                  >
                    {`Quarter ${index + 1}`}
                    {!isHistoricalSession &&
                    activeIndex >= 0 &&
                    index > activeIndex
                      ? " (Unavailable)"
                      : !isHistoricalSession && index < activeIndex
                        ? " (Read only)"
                        : ""}
                  </option>
                );
              })}
            </select>
          </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
          <button
            onClick={() => {
              const next = sortBy === "name" ? "average" : "name";
              setSortBy(next);
              flashToast(`Sorting by ${next}`);
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            title="Toggle sort field"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort</span>
          </button>

          <button
            onClick={handleExport}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="ml-auto flex items-center text-sm text-gray-500">
          Students: <span className="ml-1 font-semibold text-gray-700">{filteredAndSorted.length}</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Class Average</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            {dashboard.classAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Highest</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="h-5 w-5" />
            </span>
            {dashboard.highestAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Lowest</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <TrendingUp className="h-5 w-5" />
            </span>
            {dashboard.lowestAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">At Risk (&lt;75)</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            {dashboard.atRiskCount}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 min-w-[220px] bg-gray-50 px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Student Name
                </th>

                {visibleSubjects.map((subject) => (
                  <th
                    key={subject.key}
                    className="min-w-[110px] bg-gray-50 px-4 py-5 text-center text-xs font-bold uppercase tracking-wider text-gray-600"
                  >
                    {subject.label}
                  </th>
                ))}

                <th className="min-w-[110px] bg-gray-100 px-4 py-5 text-center text-xs font-bold uppercase tracking-wider text-gray-700">
                  Average
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.map((student) => {
                const average = calcVisibleAverage(student);
                return (
                  <tr key={student.id} className="group transition-colors hover:bg-gray-50">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-100 bg-white px-6 py-4 text-sm font-medium text-gray-900 group-hover:bg-gray-50">
                      {student.name}
                    </td>

                    {visibleSubjects.map((subj) => (
                      <td key={subj.key} className="px-4 py-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={student[subj.key]}
                          disabled={!canEditGrades || !editableSubjectKeys.has(subj.key)}
                          onFocus={(e) => e.currentTarget.select()}
                          onClick={(e) => e.currentTarget.select()}
                          onChange={(e) => handleGradeChange(student.id, subj.key, e.target.value)}
                          className={`w-14 rounded-md bg-transparent py-1 text-center text-sm font-medium outline-none transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 ${getGradeColor(student[subj.key])} ${
                            !canEditGrades || !editableSubjectKeys.has(subj.key) ? "cursor-not-allowed opacity-60" : ""
                          }`}
                          title={
                            isPublished
                              ? "Published grades are locked"
                              : !isActiveTerm
                                ? "Previous quarters are read only"
                                : !encodingOpen
                                  ? "Grade encoding is locked"
                              : !editableSubjectKeys.has(subj.key)
                              ? "You can only edit subjects you teach"
                              : "Edit grade"
                          }
                        />
                      </td>
                    ))}

                    <td className="whitespace-nowrap bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-800">{average}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {isStudentsLoading ? "Loading students..." : "No students available for selected filters."}
          </div>
        ) : null}
      </div>

      <div className="mt-6 mb-10 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={!canEditGrades}
          onClick={() => saveGrades(true)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 font-medium text-white shadow-lg shadow-gray-200 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{isPublished ? "Published and Locked" : "Publish Grades"}</span>
        </button>
      </div>

      {showToast ? (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-3 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 text-gray-300" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      ) : null}
    </div>
  );
}
