"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  TrendingUp,
  Users,
  Award,
  AlertTriangle,
  Download,
  BarChart3,
  PieChart,
  Filter,
  GraduationCap,
  FileDown,
} from "lucide-react";

type Section = "All" | string;
type Grade = "All" | string;
type Subject = "All" | string;
type Term = "Quarter 1" | "Quarter 2" | "Quarter 3" | "Quarter 4";
type DistributionBar = { label: string; count: number; color: string; heightPct: number };
type SubjectPerformance = { subject: string; score: number; color: string };
type TeacherClass = { id: number; name: string | null; gradeLevel: string | null; subjectName?: string | null };
type ApiStudent = { id: number; firstName: string; lastName: string };
type GradeApiRow = { studentId: number; score: number };
type LearnerRow = { id: number; name: string; section: string; average: number; subjectScores: Record<string, number[]> };

const SECTIONS: Section[] = ["All"];
const GRADES: Grade[] = ["All"];
const SUBJECTS: Subject[] = ["All"];
const TERMS: Term[] = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];

const SUBJECT_KEY_MAP: Record<string, string> = {
  math: "Math",
  mathematics: "Math",
  science: "Science",
  english: "English",
  filipino: "Filipino",
  mapeh: "MAPEH",
  ap: "AP",
  tle: "TLE",
  values: "Values",
  esp: "Values",
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toSubjectKey(subjectName: string | null | undefined) {
  return SUBJECT_KEY_MAP[normalize(subjectName)] ?? null;
}

function toGradingTerm(term: Term) {
  if (term === "Quarter 1") return "1st Grading";
  if (term === "Quarter 2") return "2nd Grading";
  if (term === "Quarter 3") return "3rd Grading";
  return "4th Grading";
}

export default function TeacherReportsPage() {
  const [section, setSection] = useState<Section>("All");
  const [grade, setGrade] = useState<Grade>("All");
  const [subject, setSubject] = useState<Subject>("All");
  const [term, setTerm] = useState<Term>("Quarter 3");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;
        setClasses(Array.isArray(data?.classes) ? (data.classes as TeacherClass[]) : []);
      })
      .catch(() => {
        if (active) setClasses([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    const gradingTerm = toGradingTerm(term);
    const filteredClasses =
      section === "All" && grade === "All" && subject === "All"
        ? classes
        : classes.filter((c) => {
            const sectionOk = section === "All" || (c.name?.trim() || "") === section;
            const gradeOk = grade === "All" || (c.gradeLevel?.trim() || "") === grade;
            const subjectOk = subject === "All" || (c.subjectName?.trim() || "") === subject;
            return sectionOk && gradeOk && subjectOk;
          });

    Promise.all(
      filteredClasses.map(async (cls) => {
        const [studentsRes, gradesRes] = await Promise.all([
          api.get(`/api/classes/${cls.id}/students`).catch(() => ({ data: { students: [] } })),
          toSubjectKey(cls.subjectName)
            ? api
                .get("/api/classes/grades/me", {
                  params: {
                    section: cls.name || "",
                    gradeLevel: cls.gradeLevel || "",
                    subject: toSubjectKey(cls.subjectName),
                    term: gradingTerm,
                  },
                })
                .catch(() => ({ data: { rows: [] } }))
            : Promise.resolve({ data: { rows: [] } }),
        ]);
        return {
          cls,
          students: Array.isArray(studentsRes.data?.students) ? (studentsRes.data.students as ApiStudent[]) : [],
          grades: Array.isArray(gradesRes.data?.rows) ? (gradesRes.data.rows as GradeApiRow[]) : [],
        };
      })
    )
      .then((results) => {
        if (!active) return;
        const byStudent = new Map<number, LearnerRow>();
        for (const group of results) {
          const gradeByStudent = new Map<number, number>();
          for (const g of group.grades) gradeByStudent.set(Number(g.studentId), Number(g.score) || 0);
          const subjectKey = toSubjectKey(group.cls.subjectName);

          for (const s of group.students) {
            const studentId = Number(s.id);
            const existing = byStudent.get(studentId) ?? {
              id: studentId,
              name: `${s.lastName}, ${s.firstName}`,
              section: group.cls.name?.trim() || "No section",
              average: 0,
              subjectScores: {},
            };
            if (subjectKey) {
              const score = gradeByStudent.get(studentId);
              if (typeof score === "number") {
                const current = existing.subjectScores[subjectKey] ?? [];
                existing.subjectScores[subjectKey] = [...current, score];
              }
            }
            byStudent.set(studentId, existing);
          }
        }

        const rows: LearnerRow[] = Array.from(byStudent.values()).map((student) => {
          const allScores = Object.values(student.subjectScores).flat();
          const average = allScores.length
            ? Math.round(allScores.reduce((sum, n) => sum + n, 0) / allScores.length)
            : 0;
          return { ...student, average };
        });
        setLearners(rows.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classes, grade, section, subject, term]);

  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of classes) {
      const name = cls.name?.trim();
      if (name) uniq.add(name);
    }
    return [...SECTIONS, ...Array.from(uniq)];
  }, [classes]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of classes) {
      const value = cls.gradeLevel?.trim();
      if (!value) continue;
      const key = value.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, value);
    }
    return [...GRADES, ...Array.from(uniq.values())];
  }, [classes]);
  const subjectOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of classes) {
      const value = cls.subjectName?.trim();
      if (value) uniq.add(value);
    }
    return [...SUBJECTS, ...Array.from(uniq)];
  }, [classes]);

  const kpis = useMemo(() => {
    const withGrades = learners.filter((l) => l.average > 0);
    const avgGrade = withGrades.length
      ? withGrades.reduce((sum, l) => sum + l.average, 0) / withGrades.length
      : 0;
    const atRisk = withGrades.filter((l) => l.average < 75).length;
    return { totalStudents: learners.length, avgGrade, atRisk };
  }, [learners]);

  const gradeDistribution = useMemo<DistributionBar[]>(() => {
    const withGrades = learners.filter((l) => l.average > 0);
    const buckets = [
      { label: "75-79", min: 75, max: 79, color: "bg-red-400" },
      { label: "80-84", min: 80, max: 84, color: "bg-orange-400" },
      { label: "85-89", min: 85, max: 89, color: "bg-yellow-400" },
      { label: "90-94", min: 90, max: 94, color: "bg-green-400" },
      { label: "95-100", min: 95, max: 100, color: "bg-blue-400" },
    ];
    const counts = buckets.map((bucket) => ({
      label: bucket.label,
      color: bucket.color,
      count: withGrades.filter((l) => l.average >= bucket.min && l.average <= bucket.max).length,
    }));
    const maxCount = Math.max(0, ...counts.map((c) => c.count));
    return counts.map((item) => ({
      ...item,
      heightPct: maxCount ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 0,
    }));
  }, [learners]);

  const subjectPerformance = useMemo<SubjectPerformance[]>(() => {
    const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
    const subjectStats = new Map<string, number[]>();
    for (const learner of learners) {
      for (const [subject, values] of Object.entries(learner.subjectScores)) {
        if (!values.length) continue;
        subjectStats.set(subject, [...(subjectStats.get(subject) ?? []), ...values]);
      }
    }
    let idx = 0;
    return Array.from(subjectStats.entries())
      .map(([subject, values]) => ({
        subject,
        score: Math.round(values.reduce((sum, n) => sum + n, 0) / values.length),
        color: colors[idx++ % colors.length],
      }))
      .sort((a, b) => b.score - a.score);
  }, [learners]);

  const topPerformers = useMemo(
    () => learners.filter((l) => l.average > 0).sort((a, b) => b.average - a.average).slice(0, 5),
    [learners]
  );
  const atRiskLearners = useMemo(
    () => learners.filter((l) => l.average > 0 && l.average < 75).sort((a, b) => a.average - b.average).slice(0, 5),
    [learners]
  );

  const exportLabel = useMemo(() => `${section} • ${grade} • ${subject} • ${term}`, [grade, section, subject, term]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics (Teacher)</h1>
          <p className="text-gray-500">Monitor class performance, identify at-risk learners, and export reports.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="bg-transparent text-sm outline-none">
              {sectionOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <span className="text-gray-300">|</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value as Grade)} className="bg-transparent text-sm outline-none">
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <span className="text-gray-300">|</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className="bg-transparent text-sm outline-none">
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <span className="text-gray-300">|</span>

            <select value={term} onChange={(e) => setTerm(e.target.value as Term)} className="bg-transparent text-sm outline-none">
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            {showExportMenu ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-xl">
                  <div className="border-b p-3">
                    <p className="text-xs text-gray-500">Export Scope</p>
                    <p className="text-sm font-semibold text-gray-800">{exportLabel}</p>
                  </div>

                  {["Download PDF Summary", "Download CSV Grades", "Download At-Risk List"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setShowExportMenu(false)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                    >
                      <FileDown className="h-4 w-4 text-gray-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">Learners</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.totalStudents}</p>
              <p className="mt-1 text-xs text-gray-500">{section === "All" ? "All sections" : section}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{isLoading ? "Loading students..." : "Based on enrolled students"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">Class Average</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.avgGrade.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-gray-500">{term}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{subjectPerformance.length ? "Computed from published grades" : "No grade data yet"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">At Risk</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.atRisk}</p>
              <p className="mt-1 text-xs text-gray-500">Needs intervention</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{kpis.atRisk ? "Learners below 75 average" : "No learners below 75"}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-800">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            Grade Distribution
          </h3>

          {gradeDistribution.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No grade distribution data yet.</div>
          ) : (
            <div className="flex h-64 items-end gap-4">
              {gradeDistribution.map((bar) => (
                <div key={bar.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full justify-center">
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg opacity-80 transition-all duration-500 group-hover:opacity-100 ${bar.color}`}
                      style={{ height: `${bar.heightPct}%` }}
                    />
                    <div className="absolute -top-8 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {bar.count} learners
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{bar.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-800">
            <PieChart className="h-5 w-5 text-gray-400" />
            Subject Performance
          </h3>

          {subjectPerformance.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No subject performance data yet.</div>
          ) : (
            <div className="space-y-6">
              {subjectPerformance.map((item) => (
                <div key={item.subject}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.subject}</span>
                    <span className="font-bold text-gray-900">{item.score}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <GraduationCap className="mt-0.5 h-4 w-4 text-gray-400" />
            <p>Use performance data to plan interventions once records are available.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-800">Top Performers</h3>
          {topPerformers.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No learner ranking data yet.</div>
          ) : (
            <div className="space-y-4">
              {topPerformers.map((learner, index) => (
                <div key={learner.id} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{learner.name}</p>
                      <p className="text-xs text-gray-500">{learner.section}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{learner.average}%</p>
                    <p className="text-xs text-gray-400">Average</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-800">Learners At Risk</h3>
          {atRiskLearners.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No at-risk learners data yet.</div>
          ) : (
            <div className="space-y-4">
              {atRiskLearners.map((learner) => (
                <div key={learner.id} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{learner.name}</p>
                    <p className="text-xs font-medium text-red-500">{learner.section}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{learner.average}%</p>
                    <p className="text-xs text-red-400">Average</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
