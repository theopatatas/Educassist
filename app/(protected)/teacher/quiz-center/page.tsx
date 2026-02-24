"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { CheckCircle2, Clock, ChevronRight, BarChart2, Plus, X, Calendar } from "lucide-react";

type QuizItem = {
  id: number;
  title: string;
  classId: number | null;
  className: string;
  subjectName: string;
  date: string;
  completed: number;
  total: number;
  avgScore: number;
  color: "green" | "blue" | "purple" | "orange";
  questions: number;
  timeLimit: string;
};

type ApiQuiz = {
  id: number;
  title: string;
  classId: number | null;
  subjectName?: string | null;
  sectionName?: string | null;
  dueDate?: string | null;
  questions?: number;
  timeLimit?: number | null;
  color?: "green" | "blue" | "purple" | "orange";
  completed?: number;
  total?: number;
  avgScore?: number;
};

type TeacherClass = {
  id: number;
  name: string | null;
  sectionName?: string | null;
  subjectName?: string | null;
  gradeLevel?: string | null;
};

type QuizResult = {
  id: number;
  studentId: number;
  studentName: string;
  status: "Submitted" | "In Progress" | "Not Started";
  score: number;
  timeTaken: string;
};

function normalizeValue(value?: string | null) {
  return (value || "").trim();
}

function getColor(color: QuizItem["color"]) {
  const colors: Record<QuizItem["color"], string> = {
    green: "bg-green-100 text-green-600 border-green-200",
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200",
  };
  return colors[color] || colors.blue;
}

function mapQuiz(apiQuiz: ApiQuiz): QuizItem {
  return {
    id: Number(apiQuiz.id),
    title: apiQuiz.title,
    classId: apiQuiz.classId ?? null,
    className: apiQuiz.sectionName || "Class",
    subjectName: apiQuiz.subjectName || "Subject",
    date: apiQuiz.dueDate || "No due date",
    completed: Number(apiQuiz.completed ?? 0),
    total: Number(apiQuiz.total ?? 0),
    avgScore: Number(apiQuiz.avgScore ?? 0),
    color: apiQuiz.color || "blue",
    questions: Number(apiQuiz.questions ?? 0),
    timeLimit: apiQuiz.timeLimit ? `${apiQuiz.timeLimit} mins` : "No limit",
  };
}

export default function TeacherQuizCenterPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    return window.localStorage.getItem("teacher_selected_section") || "All Sections";
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grade Levels";
    return window.localStorage.getItem("teacher_selected_grade") || "All Grade Levels";
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  const [newQuiz, setNewQuiz] = useState({
    classId: "",
    title: "",
    date: "",
    questions: "",
    timeLimit: "",
  });
  const [editQuiz, setEditQuiz] = useState({
    id: 0,
    classId: "",
    title: "",
    date: "",
    questions: "",
    timeLimit: "",
  });

  const selectedClass = useMemo(
    () => teacherClasses.find((c) => Number(c.id) === Number(newQuiz.classId)) || null,
    [teacherClasses, newQuiz.classId]
  );
  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const section = normalizeValue(cls.sectionName || cls.name);
      if (section) uniq.add(section);
    }
    for (const q of quizzes) {
      const section = normalizeValue(q.className);
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [quizzes, teacherClasses]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim();
      if (!grade || grade === "Not set") continue;
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, grade);
    }
    return ["All Grade Levels", ...Array.from(uniq.values())];
  }, [teacherClasses]);
  const classGradeById = useMemo(() => {
    const m = new Map<number, string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim();
      if (grade) m.set(Number(cls.id), grade);
    }
    return m;
  }, [teacherClasses]);
  const sectionGrades = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const cls of teacherClasses) {
      const section = normalizeValue(cls.sectionName || cls.name);
      const grade = cls.gradeLevel?.trim();
      if (!section || !grade) continue;
      const set = m.get(section) || new Set<string>();
      set.add(grade);
      m.set(section, set);
    }
    return m;
  }, [teacherClasses]);
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSection = selectedSection === "All Sections" || q.className === selectedSection;
      if (!matchesSection) return false;
      if (selectedGrade === "All Grade Levels") return true;
      const gradeFromClass = q.classId ? classGradeById.get(Number(q.classId)) : undefined;
      if (gradeFromClass) return gradeFromClass === selectedGrade;
      return sectionGrades.get(q.className)?.has(selectedGrade) ?? false;
    });
  }, [classGradeById, quizzes, sectionGrades, selectedGrade, selectedSection]);
  const filteredTeacherClasses = useMemo(() => {
    return teacherClasses.filter((c) => {
      const section = normalizeValue(c.sectionName || c.name);
      const grade = c.gradeLevel?.trim() || "";
      const matchesSection = selectedSection === "All Sections" || section === selectedSection;
      const matchesGrade = selectedGrade === "All Grade Levels" || grade === selectedGrade;
      return matchesSection && matchesGrade;
    });
  }, [teacherClasses, selectedGrade, selectedSection]);

  const loadData = async () => {
    setIsLoading(true);
    setSaveError("");
    try {
      const [classesRes, quizzesRes] = await Promise.all([api.get("/api/classes/me"), api.get("/api/quizzes/me")]);

      const classRows = Array.isArray(classesRes.data?.classes) ? (classesRes.data.classes as TeacherClass[]) : [];
      const quizRows = Array.isArray(quizzesRes.data?.quizzes) ? (quizzesRes.data.quizzes as ApiQuiz[]) : [];

      setTeacherClasses(classRows);
      setQuizzes(quizRows.map(mapQuiz));
    } catch {
      setSaveError("Failed to load quiz data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_section", selectedSection);
  }, [selectedSection]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_grade", selectedGrade);
  }, [selectedGrade]);
  useEffect(() => {
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection("All Sections");
    }
  }, [sectionOptions, selectedSection]);
  useEffect(() => {
    if (!gradeOptions.includes(selectedGrade)) {
      setSelectedGrade("All Grade Levels");
    }
  }, [gradeOptions, selectedGrade]);

  useEffect(() => {
    if (!selectedQuiz) return;
    let active = true;
    setIsResultsLoading(true);
    api
      .get(`/api/quizzes/${selectedQuiz.id}/results`)
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.results) ? (data.results as QuizResult[]) : [];
        setQuizResults(rows);
      })
      .catch(() => {
        if (active) setQuizResults([]);
      })
      .finally(() => {
        if (active) setIsResultsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedQuiz]);

  const handleCelebrate = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    try {
      await api.post("/api/quizzes/me", {
        classId: Number(newQuiz.classId),
        title: newQuiz.title,
        dueDate: newQuiz.date,
        questions: Number.parseInt(newQuiz.questions, 10),
        timeLimitMinutes: Number.parseInt(newQuiz.timeLimit, 10),
      });

      await loadData();
      setIsCreateModalOpen(false);
      setNewQuiz({ classId: "", title: "", date: "", questions: "", timeLimit: "" });
      handleCelebrate();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create quiz.";
      setSaveError(message);
    }
  };

  const openEditQuiz = (quiz: QuizItem) => {
    setEditQuiz({
      id: quiz.id,
      classId: quiz.classId ? String(quiz.classId) : "",
      title: quiz.title,
      date: quiz.date === "No due date" ? "" : quiz.date,
      questions: String(quiz.questions || ""),
      timeLimit: quiz.timeLimit === "No limit" ? "" : String(Number.parseInt(quiz.timeLimit, 10) || ""),
    });
    setIsEditModalOpen(true);
  };

  const handleEditQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    try {
      await api.patch(`/api/quizzes/${editQuiz.id}`, {
        classId: Number(editQuiz.classId),
        title: editQuiz.title,
        dueDate: editQuiz.date || null,
        questions: Number.parseInt(editQuiz.questions, 10),
        timeLimitMinutes: Number.parseInt(editQuiz.timeLimit, 10),
      });
      await loadData();
      setIsEditModalOpen(false);
      setSelectedQuiz(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update quiz.";
      setSaveError(message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {showConfetti ? (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Quiz created successfully.
          </span>
        </div>
      ) : null}

      {saveError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{saveError}</div>
      ) : null}

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quiz Center</h1>
          <p className="text-gray-500">Create quizzes by class and assign them to your students</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Select section"
          >
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Select grade level"
          >
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Create New Quiz
          </button>
        </div>
      </div>

      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading quizzes...</div> : null}

      <div className="grid gap-4">
        {filteredQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            onClick={() => setSelectedQuiz(quiz)}
            className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-bold ${getColor(quiz.color)}`}>
                {quiz.avgScore}%
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="mb-1 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{quiz.subjectName}</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{quiz.className}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" /> {quiz.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 transition-colors group-hover:text-indigo-600">{quiz.title}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {quiz.questions} Questions • {quiz.timeLimit}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-end">
                <div className="text-center">
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Completion</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${quiz.total ? Math.round((quiz.completed / quiz.total) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{quiz.completed}/{quiz.total}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Submitted: <span className="font-semibold text-green-700">{quiz.completed}</span> • Not Submitted:{" "}
                    <span className="font-semibold text-amber-700">{Math.max(quiz.total - quiz.completed, 0)}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={(e) => e.stopPropagation()} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                    <BarChart2 className="h-5 w-5" />
                  </button>
                  <button onClick={(e) => e.stopPropagation()} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isLoading && filteredQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSection === "All Sections" && selectedGrade === "All Grade Levels"
            ? "No quizzes available yet."
            : "No quizzes for selected filters."}
        </div>
      ) : null}

      {selectedQuiz ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedQuiz(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{selectedQuiz.subjectName}</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{selectedQuiz.className}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" /> {selectedQuiz.date}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedQuiz.title}</h2>
              </div>
              <button onClick={() => setSelectedQuiz(null)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-xs font-bold uppercase text-indigo-600">Submitted</p>
                  <p className="text-3xl font-bold text-indigo-900">{selectedQuiz.completed}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <p className="text-xs font-bold uppercase text-green-600">Not Submitted</p>
                  <p className="text-3xl font-bold text-green-900">{Math.max(selectedQuiz.total - selectedQuiz.completed, 0)}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase text-orange-600">Total Students</p>
                  <p className="text-2xl font-bold text-orange-900">{selectedQuiz.total}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => openEditQuiz(selectedQuiz)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Edit Quiz
                </button>
              </div>

              <h3 className="mb-4 font-bold text-gray-800">Student Results</h3>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Time Taken</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isResultsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                          Loading student results...
                        </td>
                      </tr>
                    ) : quizResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                          No student results yet.
                        </td>
                      </tr>
                    ) : (
                      quizResults.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3">{r.studentName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                r.status === "Submitted"
                                  ? "bg-green-100 text-green-700"
                                  : r.status === "In Progress"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{r.status === "Submitted" ? `${r.score}%` : "-"}</td>
                          <td className="px-4 py-3">{r.timeTaken}</td>
                          <td className="px-4 py-3 text-right text-xs text-gray-500">-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Create New Quiz</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateQuiz} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
                <select
                  required
                  value={newQuiz.classId}
                  onChange={(e) => setNewQuiz({ ...newQuiz, classId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select class</option>
                  {filteredTeacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.subjectName || "Subject"} - {cls.name || cls.gradeLevel || `Class ${cls.id}`}
                    </option>
                  ))}
                </select>
                {selectedClass ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Subject: <span className="font-semibold text-gray-700">{selectedClass.subjectName || "Subject"}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quiz Title</label>
                <input
                  required
                  type="text"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Chapter 1 Assessment"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  required
                  type="date"
                  value={newQuiz.date}
                  onChange={(e) => setNewQuiz({ ...newQuiz, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={newQuiz.timeLimit}
                  onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 45"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Number of Questions</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={newQuiz.questions}
                  onChange={(e) => setNewQuiz({ ...newQuiz, questions: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700" disabled={!teacherClasses.length}>
                  Create Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Edit Quiz</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditQuiz} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
                <select
                  required
                  value={editQuiz.classId}
                  onChange={(e) => setEditQuiz({ ...editQuiz, classId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select class</option>
                  {filteredTeacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.subjectName || "Subject"} - {cls.name || cls.gradeLevel || `Class ${cls.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quiz Title</label>
                <input
                  required
                  type="text"
                  value={editQuiz.title}
                  onChange={(e) => setEditQuiz({ ...editQuiz, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={editQuiz.date}
                  onChange={(e) => setEditQuiz({ ...editQuiz, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={editQuiz.timeLimit}
                  onChange={(e) => setEditQuiz({ ...editQuiz, timeLimit: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Number of Questions</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={editQuiz.questions}
                  onChange={(e) => setEditQuiz({ ...editQuiz, questions: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
