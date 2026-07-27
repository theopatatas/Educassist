"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Bot,
  Download,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import { sanitizeTeacherSentence } from "@/src/lib/utils/teacherInput";
import { useTeacherWorkspacePath } from "@/src/features/teacher/useTeacherWorkspacePath";

type TeacherClass = {
  id: number;
  subjectName?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
};
type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "identification"
  | "short_answer"
  | "essay";
type Question = {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string | boolean;
  explanation: string;
  points: number;
};
type LessonSection = { heading: string; content: string };
type SavedPlan = {
  id: number;
  title: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  contentJson: LessonSection[] | string;
  updatedAt: string;
};
type SavedAiQuiz = {
  id: number;
  title: string;
  subjectName?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  updatedAt: string;
  settings?: { source?: string };
};

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "identification", label: "Identification" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
];

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function blankQuestion(): Question {
  return {
    type: "multiple_choice",
    text: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 1,
  };
}

function parseSections(value: SavedPlan["contentJson"]) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as LessonSection[]) : [];
  } catch {
    return [];
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeRichText(value: string) {
  return value
    .replace(/<(script|style|iframe|object)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

type TeacherAssistantPageProps = {
  embedded?: boolean;
  initialTab?: "quiz" | "lesson";
};

export default function TeacherAssistantPage({
  embedded = false,
  initialTab = "quiz",
}: TeacherAssistantPageProps = {}) {
  const router = useRouter();
  const { workspacePath } = useTeacherWorkspacePath();
  const [tab, setTab] = useState<"quiz" | "lesson">(initialTab);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quiz, setQuiz] = useState({
    classId: "",
    subject: "",
    gradeLevel: "",
    topic: "",
    competencies: "",
    objectives: "",
    difficulty: "Medium",
    numberOfQuestions: 10,
    questionTypes: ["multiple_choice"] as QuestionType[],
    title: "",
    description: "",
    availableFrom: "",
    dueDate: "",
    published: true,
    attemptsAllowed: 1,
    randomizeQuestions: false,
    randomizeChoices: false,
    passingScore: 75,
    visibility: "class",
    timeLimitEnabled: false,
    timeLimitValue: 30,
    timeLimitUnit: "minutes",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previewQuiz, setPreviewQuiz] = useState(false);
  const [lesson, setLesson] = useState({
    id: 0,
    subject: "",
    gradeLevel: "",
    topic: "",
    competencies: "",
    objectives: "",
    duration: "",
    strategy: "",
    title: "",
  });
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedAiQuiz[]>([]);

  const loadHistory = async () => {
    const [plansResponse, quizzesResponse] = await Promise.all([
      api.get("/api/teacher-assistant/lesson-plans"),
      api.get("/api/quizzes/me"),
    ]);
    setSavedPlans(
      Array.isArray(plansResponse.data?.plans)
        ? plansResponse.data.plans
        : [],
    );
    const quizRows = Array.isArray(quizzesResponse.data?.quizzes)
      ? (quizzesResponse.data.quizzes as SavedAiQuiz[])
      : [];
    setSavedQuizzes(
      quizRows.filter((item) => item.settings?.source === "ai"),
    );
  };

  useEffect(() => {
    void Promise.all([
      api.get("/api/classes/me").then(({ data }) => {
        setClasses(Array.isArray(data?.classes) ? data.classes : []);
      }),
      loadHistory(),
    ]).catch(() => setError("Teacher Assistant data could not be loaded."));
  }, []);

  const totalPoints = useMemo(
    () => questions.reduce((sum, item) => sum + Number(item.points || 0), 0),
    [questions],
  );
  const teacherSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          classes
            .map((item) => item.subjectName?.trim())
            .filter((subject): subject is string => Boolean(subject)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [classes],
  );

  const updateQuestion = (index: number, patch: Partial<Question>) =>
    setQuestions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const generateQuiz = async () => {
    setError("");
    setNotice("");
    if (
      !quiz.subject.trim() ||
      !quiz.gradeLevel.trim() ||
      !quiz.topic.trim() ||
      !quiz.objectives.trim() ||
      !quiz.questionTypes.length
    ) {
      setError("Complete the subject, grade level, topic, objectives, and question types.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/api/teacher-assistant/quiz/generate", {
        ...quiz,
      });
      setQuiz((current) => ({
        ...current,
        title: String(data?.draft?.title ?? ""),
        description: String(data?.draft?.description ?? ""),
      }));
      setQuestions(
        Array.isArray(data?.draft?.questions) ? data.draft.questions : [],
      );
      setNotice("AI draft generated. Review and edit everything before saving.");
    } catch (requestError: unknown) {
      setError(
        (requestError as { response?: { data?: { message?: string } } })
          .response?.data?.message || "Quiz generation failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const regenerateQuestion = async (index: number) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        "/api/teacher-assistant/quiz/regenerate-question",
        {
          subject: quiz.subject,
          gradeLevel: quiz.gradeLevel,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
          type: questions[index].type,
          currentText: questions[index].text,
        },
      );
      updateQuestion(index, data.question as Question);
    } catch {
      setError("This question could not be regenerated.");
    } finally {
      setBusy(false);
    }
  };

  const saveQuiz = async () => {
    setError("");
    if (!quiz.classId || !quiz.title.trim() || !questions.length) {
      setError("Select a class and complete the quiz title and questions.");
      return;
    }
    if (questions.some((item) => !item.text.trim())) {
      setError("Every question needs question text.");
      return;
    }
    setBusy(true);
    try {
      const minutes = quiz.timeLimitEnabled
        ? quiz.timeLimitUnit === "hours"
          ? Number(quiz.timeLimitValue) * 60
          : Number(quiz.timeLimitValue)
        : null;
      const { data } = await api.post("/api/quizzes/me", {
        classId: Number(quiz.classId),
        title: quiz.title,
        description: quiz.description,
        availableFrom: quiz.availableFrom || null,
        dueDate: quiz.dueDate || null,
        published: quiz.published,
        attemptsAllowed: quiz.attemptsAllowed,
        randomizeQuestions: quiz.randomizeQuestions,
        randomizeChoices: quiz.randomizeChoices,
        passingScore: quiz.passingScore,
        visibility: quiz.visibility,
        source: "ai",
        timeLimitMinutes: minutes,
        questions: questions.length,
      });
      const id = Number(data?.quiz?.id);
      await api.put(`/api/quizzes/${id}/questions`, { questions });
      setNotice("Quiz saved to Quiz Center successfully.");
      router.push(workspacePath(`quiz-center/${id}/builder`));
    } catch (requestError: unknown) {
      setError(
        (requestError as { response?: { data?: { message?: string } } })
          .response?.data?.message || "Quiz could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const generateLesson = async () => {
    setError("");
    if (
      !lesson.subject.trim() ||
      !lesson.gradeLevel.trim() ||
      !lesson.topic.trim() ||
      !lesson.objectives.trim()
    ) {
      setError("Complete the subject, grade level, topic, and objectives.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(
        "/api/teacher-assistant/lesson/generate",
        lesson,
      );
      setLesson((current) => ({
        ...current,
        id: 0,
        title: String(data?.draft?.title ?? ""),
      }));
      setSections(
        Array.isArray(data?.draft?.sections) ? data.draft.sections : [],
      );
      setNotice("Lesson-plan draft generated. Review it before saving.");
    } catch (requestError: unknown) {
      setError(
        (requestError as { response?: { data?: { message?: string } } })
          .response?.data?.message || "Lesson-plan generation failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async () => {
    setError("");
    if (
      !lesson.title.trim() ||
      !lesson.subject.trim() ||
      !lesson.gradeLevel.trim() ||
      !lesson.topic.trim() ||
      !sections.length
    ) {
      setError("Complete the lesson details and add at least one section.");
      return;
    }
    if (lesson.id && !window.confirm("Save changes to this lesson-plan draft?"))
      return;
    setBusy(true);
    try {
      const payload = { ...lesson, sections, status: "draft" };
      const { data } = lesson.id
        ? await api.patch(
            `/api/teacher-assistant/lesson-plans/${lesson.id}`,
            payload,
          )
        : await api.post("/api/teacher-assistant/lesson-plans", payload);
      setLesson((current) => ({ ...current, id: Number(data.plan.id) }));
      await loadHistory();
      setNotice("Lesson-plan draft saved.");
    } catch {
      setError("Lesson-plan draft could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const regenerateSection = async (index: number) => {
    setBusy(true);
    try {
      const { data } = await api.post(
        "/api/teacher-assistant/lesson/regenerate-section",
        {
          subject: lesson.subject,
          gradeLevel: lesson.gradeLevel,
          topic: lesson.topic,
          ...sections[index],
        },
      );
      setSections((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? data.section : item,
        ),
      );
    } catch {
      setError("This lesson section could not be regenerated.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPlan = async (format: "pdf" | "docx") => {
    if (!lesson.id) {
      setError("Save the lesson-plan draft before downloading it.");
      return;
    }
    const response = await api.get(
      `/api/teacher-assistant/lesson-plans/${lesson.id}/${format}`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${lesson.title || "lesson-plan"}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadPlan = (plan: SavedPlan) => {
    setLesson({
      id: plan.id,
      title: plan.title,
      subject: plan.subject,
      gradeLevel: plan.gradeLevel,
      topic: plan.topic,
      competencies: "",
      objectives: "",
      duration: "",
      strategy: "",
    });
    setSections(parseSections(plan.contentJson));
    setTab("lesson");
  };

  const printLesson = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setError("Allow pop-ups to print this lesson plan.");
      return;
    }
    const sectionHtml = sections
      .map(
        (section) =>
          `<section><h2>${escapeHtml(section.heading)}</h2><div>${sanitizeRichText(section.content)}</div></section>`,
      )
      .join("");
    printWindow.document.write(
      `<!doctype html><html><head><title>${escapeHtml(lesson.title)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;color:#0f172a;line-height:1.6}h1{text-align:center}h2{margin-top:28px;border-bottom:1px solid #cbd5e1;padding-bottom:6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #94a3b8;padding:8px}</style></head><body><h1>${escapeHtml(lesson.title)}</h1><p style="text-align:center">${escapeHtml(lesson.subject)} • ${escapeHtml(lesson.gradeLevel)} • ${escapeHtml(lesson.topic)}</p>${sectionHtml}</body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div
      className={`mx-auto max-w-7xl space-y-5 ${
        embedded ? "p-3 sm:p-5" : "p-4 sm:p-6"
      }`}
    >
      {!embedded ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Teacher controlled AI</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Teacher Assistant
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Generate editable drafts. Nothing is saved or published without your approval.
            </p>
          </div>
          <Bot className="h-10 w-10 text-indigo-600" />
        </div>
        </section>
      ) : null}

      {!embedded ? (
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setTab("quiz")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ${tab === "quiz" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          AI Quiz Generator
        </button>
        <button
          onClick={() => setTab("lesson")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ${tab === "lesson" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          AI Lesson Plan
        </button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {tab === "quiz" ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Quiz requirements</h2>
            <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                Class
                <select
                  value={quiz.classId}
                  onChange={(event) => {
                    const selected = classes.find(
                      (item) => String(item.id) === event.target.value,
                    );
                    setQuiz((current) => ({
                      ...current,
                      classId: event.target.value,
                      subject: selected?.subjectName || current.subject,
                      gradeLevel: selected?.gradeLevel || current.gradeLevel,
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">Select class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subjectName} • {item.gradeLevel} • {item.sectionName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                Subject
                <select
                  value={quiz.subject}
                  onChange={(event) =>
                    setQuiz((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="">Select subject</option>
                  {teacherSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              {(["gradeLevel", "topic"] as const).map((key) => (
                <label key={key} className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                  {key === "gradeLevel" ? "Grade level" : key[0].toUpperCase() + key.slice(1)}
                  <input
                    value={quiz[key]}
                    placeholder={
                      key === "gradeLevel"
                        ? "Example: Grade 9"
                        : "Example: Photosynthesis"
                    }
                    onChange={(event) =>
                      setQuiz((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
              ))}
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                Learning competencies
                <textarea
                  rows={3}
                  value={quiz.competencies}
                  placeholder="Example: Explain how plants convert light energy into chemical energy through photosynthesis."
                  onChange={(event) =>
                    setQuiz((current) => ({ ...current, competencies: event.target.value }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                Learning objectives
                <textarea
                  rows={3}
                  value={quiz.objectives}
                  placeholder="Example: Students should be able to identify the stages of photosynthesis and explain their importance."
                  onChange={(event) =>
                    setQuiz((current) => ({ ...current, objectives: event.target.value }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                Difficulty
                <select
                  value={quiz.difficulty}
                  onChange={(event) =>
                    setQuiz((current) => ({ ...current, difficulty: event.target.value }))
                  }
                  className={fieldClass}
                >
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                Number of questions
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quiz.numberOfQuestions}
                  placeholder="Enter 1 to 50"
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  onChange={(event) =>
                    setQuiz((current) => ({
                      ...current,
                      numberOfQuestions: Number(event.target.value),
                    }))
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Question types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {questionTypes.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={quiz.questionTypes.includes(item.value)}
                      onChange={() =>
                        setQuiz((current) => ({
                          ...current,
                          questionTypes: current.questionTypes.includes(item.value)
                            ? current.questionTypes.filter((value) => value !== item.value)
                            : [...current.questionTypes, item.value],
                        }))
                      }
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={generateQuiz}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {busy ? "Generating…" : "Generate editable quiz"}
            </button>
          </section>

          {questions.length ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Quiz title
                    <input value={quiz.title} placeholder="Enter the quiz title" onChange={(e) => setQuiz((c) => ({ ...c, title: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Passing score (%)
                    <input type="number" min={0} max={100} value={quiz.passingScore} placeholder="Example: 75" onChange={(e) => setQuiz((c) => ({ ...c, passingScore: Number(e.target.value) }))} className={fieldClass} />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Description / instructions
                    <textarea rows={3} value={quiz.description} placeholder="Enter instructions for students" onChange={(e) => setQuiz((c) => ({ ...c, description: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Availability date<input type="datetime-local" value={quiz.availableFrom} onChange={(e) => setQuiz((c) => ({ ...c, availableFrom: e.target.value }))} className={fieldClass} /></label>
                  <label className="text-sm font-medium text-slate-700">Due date<input type="date" value={quiz.dueDate} onChange={(e) => setQuiz((c) => ({ ...c, dueDate: e.target.value }))} className={fieldClass} /></label>
                  <label className="text-sm font-medium text-slate-700">Attempts allowed<input type="number" min={1} value={quiz.attemptsAllowed} placeholder="Example: 1" onChange={(e) => setQuiz((c) => ({ ...c, attemptsAllowed: Number(e.target.value) }))} className={fieldClass} /></label>
                  <label className="text-sm font-medium text-slate-700">Visibility<select value={quiz.visibility} onChange={(e) => setQuiz((c) => ({ ...c, visibility: e.target.value }))} className={fieldClass}><option value="class">Assigned class</option><option value="private">Private draft</option></select></label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
                  <label><input type="checkbox" checked={quiz.published} onChange={(e) => setQuiz((c) => ({ ...c, published: e.target.checked }))} className="mr-2" />Publish for students</label>
                  <label><input type="checkbox" checked={quiz.randomizeQuestions} onChange={(e) => setQuiz((c) => ({ ...c, randomizeQuestions: e.target.checked }))} className="mr-2" />Randomize questions</label>
                  <label><input type="checkbox" checked={quiz.randomizeChoices} onChange={(e) => setQuiz((c) => ({ ...c, randomizeChoices: e.target.checked }))} className="mr-2" />Randomize choices</label>
                  <label><input type="checkbox" checked={quiz.timeLimitEnabled} onChange={(e) => setQuiz((c) => ({ ...c, timeLimitEnabled: e.target.checked }))} className="mr-2" />Enable time limit</label>
                </div>
                {quiz.timeLimitEnabled ? (
                  <div className="mt-3 flex max-w-sm gap-2">
                    <input type="number" min={1} value={quiz.timeLimitValue} placeholder="Enter time limit" onChange={(e) => setQuiz((c) => ({ ...c, timeLimitValue: Number(e.target.value) }))} className={fieldClass} />
                    <select value={quiz.timeLimitUnit} onChange={(e) => setQuiz((c) => ({ ...c, timeLimitUnit: e.target.value }))} className={fieldClass}><option value="minutes">Minutes</option><option value="hours">Hours</option></select>
                  </div>
                ) : null}
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  {questions.length} questions • {totalPoints} total points
                </p>
              </div>

              {!previewQuiz
                ? questions.map((question, index) => (
                    <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-900">Question {index + 1}</p>
                        <div className="flex gap-1">
                          <button onClick={() => moveQuestion(index, -1)} disabled={index === 0} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                          <button onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                          <button onClick={() => void regenerateQuestion(index)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Regenerate question"><RefreshCw className="h-4 w-4" /></button>
                          <button onClick={() => setQuestions((c) => c.filter((_, i) => i !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Remove question"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_100px]">
                        <textarea rows={3} value={question.text} onChange={(e) => updateQuestion(index, { text: e.target.value })} className={fieldClass} />
                        <select value={question.type} onChange={(e) => updateQuestion(index, { type: e.target.value as QuestionType, options: e.target.value === "multiple_choice" ? ["", "", "", ""] : [] })} className={fieldClass}>{questionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                        <input type="number" min={1} value={question.points} onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })} className={fieldClass} />
                      </div>
                      {question.type === "multiple_choice" ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="flex items-center gap-2">
                              <input type="radio" name={`answer-${index}`} checked={question.correctAnswer === option && Boolean(option)} onChange={() => updateQuestion(index, { correctAnswer: option })} />
                              <input value={option} onChange={(e) => updateQuestion(index, { options: question.options.map((value, i) => i === optionIndex ? e.target.value : value), correctAnswer: question.correctAnswer === option ? e.target.value : question.correctAnswer })} className={fieldClass} placeholder={`Choice ${optionIndex + 1}`} />
                            </label>
                          ))}
                        </div>
                      ) : question.type === "true_false" ? (
                        <select value={String(question.correctAnswer)} onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value === "true" })} className={`${fieldClass} max-w-xs`}><option value="true">True</option><option value="false">False</option></select>
                      ) : (
                        <textarea rows={question.type === "essay" ? 4 : 2} value={String(question.correctAnswer)} onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })} className={fieldClass} placeholder="Answer key / suggested answer" />
                      )}
                      <textarea rows={2} value={question.explanation} onChange={(e) => updateQuestion(index, { explanation: e.target.value })} className={fieldClass} placeholder="Optional explanation / rationale" />
                    </article>
                  ))
                : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">{quiz.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-slate-600">{quiz.description}</p>
                    <ol className="mt-6 space-y-5">
                      {questions.map((question, index) => <li key={index}><b>{index + 1}. {question.text}</b>{question.options.length ? <ul className="mt-2 list-disc pl-6">{question.options.map((option) => <li key={option}>{option}</li>)}</ul> : null}</li>)}
                    </ol>
                  </div>
                )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => setQuestions((c) => [...c, blankQuestion()])} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" />Add question</button>
                <button onClick={() => setPreviewQuiz((value) => !value)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold hover:bg-slate-50">{previewQuiz ? "Back to editor" : "Preview quiz"}</button>
                <button onClick={saveQuiz} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:ml-auto"><Save className="h-4 w-4" />Save to Quiz Center</button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpenText className="h-5 w-5" />
              Quiz Generator History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              AI quizzes appear here only after you save them to Quiz Center.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedQuizzes.length ? (
                savedQuizzes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      router.push(workspacePath(`quiz-center/${item.id}/builder`))
                    }
                    className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30"
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[item.subjectName, item.gradeLevel, item.sectionName]
                        .filter(Boolean)
                        .join(" • ") || "Quiz Center"}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No saved AI-generated quizzes yet.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">DepEd lesson plan requirements</h2>
              <p className="mt-1 text-sm text-slate-500">
                Generates an editable Philippine DepEd-aligned Daily Lesson Plan.
              </p>
            </div>
            <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                Subject
                <select
                  value={lesson.subject}
                  onChange={(event) =>
                    setLesson((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="">Select subject</option>
                  {teacherSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              {(["gradeLevel", "topic", "duration", "strategy"] as const).map((key) => (
                <label key={key} className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                  {key === "gradeLevel"
                    ? "Grade level"
                    : key === "duration"
                      ? "Teaching time"
                      : key[0].toUpperCase() + key.slice(1)}
                  <input
                    value={lesson[key]}
                    placeholder={
                      key === "gradeLevel"
                        ? "Example: Grade 9"
                        : key === "topic"
                          ? "Example: Photosynthesis"
                          : key === "duration"
                            ? "Example: 60 minutes"
                            : "Example: Collaborative learning"
                    }
                    onChange={(e) => setLesson((c) => ({ ...c, [key]: e.target.value }))}
                    className={fieldClass}
                  />
                </label>
              ))}
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700 sm:col-span-2">Learning competencies<textarea rows={3} value={lesson.competencies} placeholder="Example: Explain how plants convert light energy into chemical energy through photosynthesis." onChange={(e) => setLesson((c) => ({ ...c, competencies: e.target.value }))} className={fieldClass} /></label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700 sm:col-span-2">Learning objectives<textarea rows={3} value={lesson.objectives} placeholder="Example: At the end of the lesson, students should be able to describe the process of photosynthesis and label its major stages." onChange={(e) => setLesson((c) => ({ ...c, objectives: e.target.value }))} className={fieldClass} /></label>
            </div>
            <button onClick={generateLesson} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"><Sparkles className="h-4 w-4" />{busy ? "Generating…" : "Generate lesson plan"}</button>
          </section>

          {sections.length ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="text-sm font-medium text-slate-700">Lesson title<input value={lesson.title} placeholder="Enter the lesson title" onChange={(e) => setLesson((c) => ({ ...c, title: e.target.value }))} className={fieldClass} /></label>
              </div>
              {sections.map((section, index) => (
                <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={section.heading} onChange={(e) => setSections((c) => c.map((item, i) => i === index ? { ...item, heading: e.target.value } : item))} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 font-bold" />
                    <button onClick={() => void regenerateSection(index)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Regenerate section"><RefreshCw className="h-4 w-4" /></button>
                    <button onClick={() => setSections((c) => c.filter((_, i) => i !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete section"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-2 print:hidden">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("bold"); }} className="rounded px-2 py-1 text-sm font-bold hover:bg-white">B</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertUnorderedList"); }} className="rounded px-2 py-1 text-sm hover:bg-white">• List</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertHTML", false, "<table border='1'><tr><td>Cell</td><td>Cell</td></tr></table>"); }} className="rounded px-2 py-1 text-sm hover:bg-white">Table</button>
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.content) }}
                    onBeforeInput={(event) => {
                      const inserted = (
                        event.nativeEvent as InputEvent
                      ).data;
                      if (
                        inserted &&
                        sanitizeTeacherSentence(inserted) !== inserted
                      ) {
                        event.preventDefault();
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      const text = sanitizeTeacherSentence(
                        event.clipboardData.getData("text/plain"),
                      );
                      document.execCommand("insertText", false, text);
                    }}
                    onBlur={(e) => setSections((c) => c.map((item, i) => i === index ? { ...item, content: sanitizeRichText(e.currentTarget.innerHTML) } : item))}
                    className="min-h-36 rounded-b-xl border border-slate-200 p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </article>
              ))}
              <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
                <button onClick={() => setSections((c) => [...c, { heading: "New Section", content: "" }])} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" />Add section</button>
                <button onClick={saveLesson} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Save draft</button>
                <button onClick={() => void downloadPlan("pdf")} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold"><Download className="h-4 w-4" />PDF</button>
                <button onClick={() => void downloadPlan("docx")} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold"><FileText className="h-4 w-4" />DOCX</button>
                <button onClick={printLesson} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold"><Printer className="h-4 w-4" />Print</button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpenText className="h-5 w-5" />Lesson Plan Generator History</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lesson plans appear here only after you save the draft.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedPlans.length ? savedPlans.map((plan) => (
                <button key={plan.id} onClick={() => loadPlan(plan)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30">
                  <p className="font-semibold text-slate-900">{plan.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{plan.subject} • {plan.gradeLevel}</p>
                </button>
              )) : <p className="text-sm text-slate-500">No saved lesson plans yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
