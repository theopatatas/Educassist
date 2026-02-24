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
const GRADE_FILTERS_STORAGE_KEY = "teacher-grade-portal-filters-v1";

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
    return ["All Grades", ...Array.from(uniq.values())];
  }, [teacherClasses]);
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
  }, [filteredTeacherClasses]);
  useEffect(() => {
    if (effectiveSection === "All Sections" || effectiveGrade === "All Grades") {
      return;
    }
    if (grades.length === 0) {
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
          setGrades((prev) =>
            prev.map((student) => {
              const next = { ...student };
              for (const subject of subjectsToLoad) {
                next[subject] = scoreMaps.get(subject)?.get(student.id) ?? 0;
              }
              return next;
            })
          );
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
          setGrades((prev) =>
            prev.map((student) => ({
              ...student,
              [selectedSubject]: scoreByStudentId.get(student.id) ?? 0,
            }))
          );
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
  }, [editableSubjectKeys, effectiveGrade, effectiveSection, grades.length, selectedSubject, term]);

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

  const handlePublishToggle = () => {
    if (effectiveSection === "All Sections" || effectiveGrade === "All Grades") {
      flashToast("Select section and grade before publishing");
      return;
    }
    const publish = !isPublished;
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
            publish ? "Grades published for all subjects" : "Grades set back to draft for all subjects"
          );
        })
        .catch(() => {
          flashToast("Failed to publish grades for all subjects");
        });
      return;
    }
    if (!editableSubjectKeys.has(selectedSubject)) {
      flashToast("You can only publish grades for subjects you teach");
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
        flashToast(publish ? "Grades published to students" : "Grades set back to draft");
      })
      .catch(() => {
        flashToast("Failed to publish grades");
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
    <div className="relative mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Gradebook</h1>
          <p className="text-gray-500">Manage and record student grades • {term}</p>
        </div>

        <div className="flex w-full flex-wrap gap-3 lg:w-auto">
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as "all" | SubjectKey)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjectOptions.map((subjectKey) => (
                <option key={subjectKey} value={subjectKey}>
                  {subjectKey === "all" ? "All Subjects" : SUBJECTS.find((s) => s.key === subjectKey)?.label || subjectKey}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as Term)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1st Grading">1st Grading</option>
              <option value="2nd Grading">2nd Grading</option>
              <option value="3rd Grading">3rd Grading</option>
              <option value="4th Grading">4th Grading</option>
            </select>
          </div>

          <div className="relative min-w-[220px] flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={() => {
              const next = sortBy === "name" ? "average" : "name";
              setSortBy(next);
              flashToast(`Sorting by ${next}`);
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            title="Toggle sort field"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort</span>
          </button>

          <button
            onClick={handleExport}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

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
            <BarChart3 className="h-5 w-5 text-gray-500" />
            {dashboard.classAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Highest</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Trophy className="h-5 w-5 text-gray-500" />
            {dashboard.highestAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Lowest</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            {dashboard.lowestAverage}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">At Risk (&lt;75)</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
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
                          disabled={isPublished || !editableSubjectKeys.has(subj.key)}
                          onChange={(e) => handleGradeChange(student.id, subj.key, e.target.value)}
                          className={`w-14 rounded-md bg-transparent py-1 text-center text-sm font-medium outline-none transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 ${getGradeColor(student[subj.key])} ${
                            isPublished || !editableSubjectKeys.has(subj.key) ? "cursor-not-allowed opacity-60" : ""
                          }`}
                          title={
                            isPublished
                              ? "Unpublish to edit grades"
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

      <div className="mt-6 mb-10 flex justify-end">
        <button
          onClick={handlePublishToggle}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white shadow-lg transition-colors ${
            isPublished ? "bg-gray-900 shadow-gray-200 hover:bg-gray-800" : "bg-gray-700 shadow-gray-200 hover:bg-gray-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{isPublished ? "Unpublish" : "Publish"}</span>
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
