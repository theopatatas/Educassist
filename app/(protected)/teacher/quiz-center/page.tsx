"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import { CheckCircle2, Clock, ChevronDown, BarChart2, Plus, X, Calendar } from "lucide-react";

type QuizItem = {
  id: number;
  title: string;
  classId: number | null;
  className: string;
  gradeLevel: string;
  subjectName: string;
  date: string;
  completed: number;
  total: number;
  avgScore: number;
  publishResults: boolean;
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
  gradeLevel?: string | null;
  dueDate?: string | null;
  questions?: number;
  timeLimit?: number | null;
  color?: "green" | "blue" | "purple" | "orange";
  completed?: number;
  total?: number;
  avgScore?: number;
  publishResults?: boolean;
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

type QuizAnalytics = {
  totalStudents: number;
  submitted: number;
  notSubmitted: number;
  inProgress: number;
  averageScore: number;
  questionStats: Array<{
    id: number;
    order: number;
    text: string;
    type: string;
    points: number;
    submissions: number;
    correctCount: number;
    correctRate: number;
  }>;
};

function normalizeValue(value?: string | null) {
  return (value || "").trim();
}

function formatClassOptionLabel(cls: TeacherClass) {
  const subject = cls.subjectName || "Subject";
  const gradeLevel = cls.gradeLevel || "Grade";
  const section = cls.sectionName || cls.name || "Section";
  return `${subject} - ${gradeLevel} - ${section}`;
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

function formatGradeSection(gradeLevel?: string | null, section?: string | null) {
  const grade = (gradeLevel || "").trim();
  const sectionName = (section || "").trim();
  if (grade && sectionName) return `${grade} • ${sectionName}`;
  return grade || sectionName || "Not set";
}

function getTodayDateInputValue() {
  return new Date().toISOString().split("T")[0];
}

function isPastDateOnly(value?: string | null) {
  if (!value) return false;
  return value < getTodayDateInputValue();
}

function mapQuiz(apiQuiz: ApiQuiz): QuizItem {
  return {
    id: Number(apiQuiz.id),
    title: apiQuiz.title,
    classId: apiQuiz.classId ?? null,
    className: apiQuiz.sectionName || "Class",
    gradeLevel: apiQuiz.gradeLevel || "",
    subjectName: apiQuiz.subjectName || "Subject",
    date: apiQuiz.dueDate || "No due date",
    completed: Number(apiQuiz.completed ?? 0),
    total: Number(apiQuiz.total ?? 0),
    avgScore: Number(apiQuiz.avgScore ?? 0),
    publishResults: Boolean(apiQuiz.publishResults ?? false),
    color: apiQuiz.color || "blue",
    questions: Number(apiQuiz.questions ?? 0),
    timeLimit: apiQuiz.timeLimit ? `${apiQuiz.timeLimit} mins` : "No limit",
  };
}

function getQuizStatus(date: string) {
  if (!date || date === "No due date") return "Open";
  const now = new Date();
  const due = new Date(date);
  return Number.isNaN(due.getTime()) ? "Open" : due < now ? "Closed" : "Open";
}

export default function TeacherQuizCenterPage() {
  const router = useRouter();
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
  const [selectedSubject, setSelectedSubject] = useState(() => {
    if (typeof window === "undefined") return "All Subjects";
    return window.localStorage.getItem("teacher_selected_subject") || "All Subjects";
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newQuizDateError, setNewQuizDateError] = useState("");
  const [editQuizDateError, setEditQuizDateError] = useState("");
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null);

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
    publishResults: false,
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
  const subjectOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const subject = normalizeValue(cls.subjectName);
      if (subject) uniq.add(subject);
    }
    for (const quiz of quizzes) {
      const subject = normalizeValue(quiz.subjectName);
      if (subject) uniq.add(subject);
    }
    return ["All Subjects", ...Array.from(uniq)];
  }, [quizzes, teacherClasses]);
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
      const matchesSubject = selectedSubject === "All Subjects" || q.subjectName === selectedSubject;
      if (!matchesSubject) return false;
      const matchesSection = selectedSection === "All Sections" || q.className === selectedSection;
      if (!matchesSection) return false;
      if (selectedGrade === "All Grade Levels") return true;
      const gradeFromClass = q.classId ? classGradeById.get(Number(q.classId)) : undefined;
      if (gradeFromClass) return gradeFromClass === selectedGrade;
      return sectionGrades.get(q.className)?.has(selectedGrade) ?? false;
    });
  }, [classGradeById, quizzes, sectionGrades, selectedGrade, selectedSection, selectedSubject]);
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
    window.localStorage.setItem("teacher_selected_subject", selectedSubject);
  }, [selectedSubject]);
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
    if (!subjectOptions.includes(selectedSubject)) {
      setSelectedSubject("All Subjects");
    }
  }, [selectedSubject, subjectOptions]);

  useEffect(() => {
    if (!selectedQuiz) return;
    let active = true;
    setIsResultsLoading(true);
    setIsAnalyticsLoading(true);
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
    api
      .get(`/api/quizzes/${selectedQuiz.id}/analytics`)
      .then(({ data }) => {
        if (!active) return;
        setQuizAnalytics((data?.analytics as QuizAnalytics) ?? null);
      })
      .catch(() => {
        if (active) setQuizAnalytics(null);
      })
      .finally(() => {
        if (active) setIsAnalyticsLoading(false);
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
    setNewQuizDateError("");
    if (isPastDateOnly(newQuiz.date)) {
      setNewQuizDateError("You cannot create a quiz with a past date.");
      return;
    }

    try {
      const { data } = await api.post("/api/quizzes/me", {
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
      const createdId = Number(data?.quiz?.id ?? 0);
      if (createdId) {
        router.push(`/teacher/quiz-center/${createdId}/builder`);
      }
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
      publishResults: quiz.publishResults,
    });
    setIsEditModalOpen(true);
  };

  const handleEditQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setEditQuizDateError("");
    if (isPastDateOnly(editQuiz.date || null)) {
      setEditQuizDateError("You cannot create a quiz with a past date.");
      return;
    }

    try {
      await api.patch(`/api/quizzes/${editQuiz.id}`, {
        classId: Number(editQuiz.classId),
        title: editQuiz.title,
        dueDate: editQuiz.date || null,
        questions: Number.parseInt(editQuiz.questions, 10),
        timeLimitMinutes: Number.parseInt(editQuiz.timeLimit, 10),
        publishResults: editQuiz.publishResults,
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

  const togglePublish = async (quiz: QuizItem) => {
    setSaveError("");
    try {
      await api.patch(`/api/quizzes/${quiz.id}`, {
        classId: quiz.classId,
        title: quiz.title,
        dueDate: quiz.date === "No due date" ? null : quiz.date,
        questions: quiz.questions,
        timeLimitMinutes: quiz.timeLimit === "No limit" ? null : Number.parseInt(quiz.timeLimit, 10),
        publishResults: !quiz.publishResults,
      });
      await loadData();
      setSelectedQuiz((prev) => (prev && prev.id === quiz.id ? { ...prev, publishResults: !prev.publishResults } : prev));
    } catch {
      setSaveError("Failed to update publish status.");
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

      <div className="mb-8 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quiz Center</h1>
          <p className="text-gray-500">Create quizzes by class and assign them to your students</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:flex-nowrap xl:w-auto xl:justify-end">
          <div className="relative w-full min-w-[210px] flex-1 md:w-auto md:flex-none">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 w-full appearance-none whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-4 pr-12 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
              aria-label="Select grade level"
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative w-full min-w-[170px] flex-1 md:w-auto md:flex-none">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 w-full appearance-none whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-4 pr-12 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
              aria-label="Select section"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative w-full min-w-[170px] flex-1 md:w-auto md:flex-none">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-10 w-full appearance-none whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-4 pr-12 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
              aria-label="Select subject"
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 md:w-auto"
          >
            <Plus className="h-5 w-5" />
            Create New Quiz
          </button>
        </div>
      </div>

      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading quizzes...</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            onClick={() => setSelectedQuiz(quiz)}
            className="group cursor-pointer rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getColor(quiz.color)}`}>{quiz.subjectName}</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${getQuizStatus(quiz.date) === "Closed" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}`}>
                    {getQuizStatus(quiz.date)}
                  </span>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${quiz.publishResults ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {quiz.publishResults ? "Results Published" : "Draft Results"}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 transition-colors group-hover:text-indigo-600">{quiz.title}</h3>

              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatGradeSection(quiz.gradeLevel, quiz.className)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{quiz.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{quiz.timeLimit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart2 className="h-4 w-4 text-gray-400" />
                  <span>{quiz.total} assigned student{quiz.total === 1 ? "" : "s"}</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-500">Submissions</span>
                  <span className="font-bold text-gray-700">{quiz.completed}/{quiz.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${quiz.total ? Math.round((quiz.completed / quiz.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Submitted: <span className="font-semibold text-green-700">{quiz.completed}</span>
                  </span>
                  <span>
                    Not Submitted: <span className="font-semibold text-amber-700">{Math.max(quiz.total - quiz.completed, 0)}</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void togglePublish(quiz);
                  }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    quiz.publishResults ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {quiz.publishResults ? "Results Published" : "Publish Results"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuiz(quiz);
                  }}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isLoading && filteredQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSection === "All Sections" && selectedGrade === "All Grade Levels" && selectedSubject === "All Subjects"
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
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {formatGradeSection(selectedQuiz.gradeLevel, selectedQuiz.className)}
                  </span>
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
                <div className="flex gap-3">
                  <button
                    type="button"
                  onClick={() => router.push(`/teacher/quiz-center/${selectedQuiz.id}/builder`)}
                  className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Edit Questions
                </button>
                  <button
                    type="button"
                    onClick={() => void togglePublish(selectedQuiz)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedQuiz.publishResults ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {selectedQuiz.publishResults ? "Results Published" : "Publish Results"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditQuiz(selectedQuiz)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Edit Quiz
                  </button>
                </div>
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
                        <tr key={`${r.studentId}-${r.status}-${r.id}`}>
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

              <div className="mt-8">
                <h3 className="mb-4 font-bold text-gray-800">Quiz Analytics</h3>
                {isAnalyticsLoading ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    Loading analytics...
                  </div>
                ) : !quizAnalytics ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    No analytics available yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                        <p className="text-xs font-bold uppercase text-indigo-600">Submitted</p>
                        <p className="text-2xl font-bold text-indigo-900">{quizAnalytics.submitted}</p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase text-amber-600">In Progress</p>
                        <p className="text-2xl font-bold text-amber-900">{quizAnalytics.inProgress}</p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                        <p className="text-xs font-bold uppercase text-red-600">Not Submitted</p>
                        <p className="text-2xl font-bold text-red-900">{quizAnalytics.notSubmitted}</p>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                        <p className="text-xs font-bold uppercase text-green-600">Average Score</p>
                        <p className="text-2xl font-bold text-green-900">{quizAnalytics.averageScore}%</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {quizAnalytics.questionStats.map((stat) => (
                        <div key={stat.id} className="rounded-xl border border-gray-200 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase text-gray-400">
                                Question {stat.order} • {stat.type.replaceAll("_", " ")} • {stat.points} pt{stat.points > 1 ? "s" : ""}
                              </p>
                              <p className="mt-1 font-semibold text-gray-800">{stat.text}</p>
                            </div>
                            <div className="text-sm text-gray-600 md:text-right">
                              <p>Submissions: <span className="font-semibold text-gray-800">{stat.submissions}</span></p>
                              <p>Correct: <span className="font-semibold text-green-700">{stat.correctCount}</span></p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                              <span>Correct answer rate</span>
                              <span className="font-semibold text-gray-700">{stat.correctRate}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${stat.correctRate}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      {formatClassOptionLabel(cls)}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewQuiz({ ...newQuiz, date: value });
                    setNewQuizDateError(isPastDateOnly(value) ? "You cannot create a quiz with a past date." : "");
                  }}
                  className={`w-full rounded-xl border px-4 py-2 outline-none focus:border-transparent focus:ring-2 ${
                    newQuizDateError ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-indigo-500"
                  }`}
                />
                {newQuizDateError ? <p className="mt-1 text-xs text-red-600">{newQuizDateError}</p> : null}
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
                      {formatClassOptionLabel(cls)}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditQuiz({ ...editQuiz, date: value });
                    setEditQuizDateError(isPastDateOnly(value) ? "You cannot create a quiz with a past date." : "");
                  }}
                  className={`w-full rounded-xl border px-4 py-2 outline-none focus:border-transparent focus:ring-2 ${
                    editQuizDateError ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-indigo-500"
                  }`}
                />
                {editQuizDateError ? <p className="mt-1 text-xs text-red-600">{editQuizDateError}</p> : null}
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
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={editQuiz.publishResults}
                  onChange={(e) => setEditQuiz({ ...editQuiz, publishResults: e.target.checked })}
                  className="h-4 w-4"
                />
                Publish quiz results to students
              </label>
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
