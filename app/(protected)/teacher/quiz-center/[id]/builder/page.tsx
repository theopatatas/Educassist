"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import { ArrowLeft, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";

type QuestionType = "multiple_choice" | "checkbox" | "true_false" | "short_answer";

type BuilderQuestion = {
  id?: number;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string | string[] | boolean;
  points: number;
};

type QuizDetail = {
  id: number;
  title: string;
  className: string;
  subjectName: string;
  dueDate?: string | null;
  timeLimit?: number | null;
  questionCount: number;
  questions: BuilderQuestion[];
};

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
];

function makeBlankQuestion(type: QuestionType = "multiple_choice"): BuilderQuestion {
  return {
    type,
    text: "",
    options: type === "true_false" ? ["True", "False"] : ["", ""],
    correctAnswer: type === "checkbox" ? [] : type === "true_false" ? true : "",
    points: 1,
  };
}

export default function TeacherQuizBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = String(params?.id ?? "");

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) return;
    let active = true;

    api
      .get(`/api/quizzes/${quizId}`)
      .then(({ data }) => {
        if (!active) return;
        const row = (data?.quiz as QuizDetail) ?? null;
        setQuiz(row);
        if (row?.questions?.length) {
          setQuestions(
            row.questions.map((question) => ({
              ...question,
              options:
                question.type === "true_false"
                  ? ["True", "False"]
                  : Array.isArray(question.options) && question.options.length
                  ? question.options
                  : ["", ""],
            }))
          );
        } else {
          const count = Math.max(1, Number(row?.questionCount ?? 1));
          setQuestions(Array.from({ length: count }, () => makeBlankQuestion()));
        }
      })
      .catch(() => {
        if (active) setError("Failed to load quiz builder.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  const totalPoints = useMemo(() => questions.reduce((sum, question) => sum + Number(question.points || 0), 0), [questions]);

  const setQuestion = (index: number, next: Partial<BuilderQuestion>) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) => (currentIndex === index ? { ...question, ...next } : question))
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, makeBlankQuestion()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      })
    );
  };

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) =>
        currentIndex === questionIndex ? { ...question, options: [...question.options, ""] } : question
      )
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) return question;
        const nextOptions = question.options.filter((_, index) => index !== optionIndex);
        return { ...question, options: nextOptions.length ? nextOptions : [""] };
      })
    );
  };

  const handleTypeChange = (index: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) => {
        if (currentIndex !== index) return question;
        return {
          ...question,
          type,
          options: type === "true_false" ? ["True", "False"] : type === "short_answer" ? [] : ["", ""],
          correctAnswer: type === "checkbox" ? [] : type === "true_false" ? true : "",
        };
      })
    );
  };

  const toggleCheckboxCorrect = (questionIndex: number, option: string) => {
    setQuestions((prev) =>
      prev.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) return question;
        const current = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
        const exists = current.includes(option);
        return {
          ...question,
          correctAnswer: exists ? current.filter((item) => item !== option) : [...current, option],
        };
      })
    );
  };

  const handleSave = async () => {
    setError("");
    setStatus("");

    const cleanedQuestions = questions.map((question) => ({
      ...question,
      text: question.text.trim(),
      options:
        question.type === "multiple_choice" || question.type === "checkbox"
          ? question.options.map((option) => option.trim()).filter(Boolean)
          : question.type === "true_false"
          ? ["True", "False"]
          : [],
    }));

    if (cleanedQuestions.some((question) => !question.text)) {
      setError("Please add question text for every item before saving.");
      return;
    }

    if (
      cleanedQuestions.some(
        (question) =>
          (question.type === "multiple_choice" || question.type === "checkbox") &&
          question.options.filter(Boolean).length < 2
      )
    ) {
      setError("Multiple choice and checkbox questions need at least two answer options.");
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/api/quizzes/${quizId}/questions`, { questions: cleanedQuestions });
      setStatus("Quiz builder saved. Students can now answer this quiz.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save quiz questions.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-6 text-sm text-gray-500">Loading quiz builder...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/teacher/quiz-center")}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quiz Center
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{quiz?.title || "Quiz Builder"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {quiz?.subjectName || "Subject"} • {quiz?.className || "Class"} • {questions.length} question{questions.length !== 1 ? "s" : ""} • {totalPoints} total points
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Quiz"}
          </button>
        </div>
      </div>

      {status ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {status}
          </span>
        </div>
      ) : null}

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="space-y-5">
        {questions.map((question, index) => {
          const checkboxAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];

          return (
            <div key={`${question.id ?? "new"}-${index}`} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Question {index + 1}</p>
                  <p className="mt-1 text-sm text-gray-500">Google Forms style quiz item with auto-grading support.</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px_120px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Question text</label>
                  <textarea
                    rows={3}
                    value={question.text}
                    onChange={(e) => setQuestion(index, { text: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type your question here"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Question type</label>
                  <select
                    value={question.type}
                    onChange={(e) => handleTypeChange(index, e.target.value as QuestionType)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  >
                    {QUESTION_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Points</label>
                  <input
                    type="number"
                    min={1}
                    value={question.points}
                    onChange={(e) => setQuestion(index, { points: Number(e.target.value) || 1 })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {question.type === "multiple_choice" || question.type === "checkbox" ? (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Answer options</label>
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Add option
                    </button>
                  </div>
                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={`${index}-${optionIndex}`} className="flex items-center gap-3">
                        {question.type === "multiple_choice" ? (
                          <input
                            type="radio"
                            name={`correct-answer-${index}`}
                            checked={question.correctAnswer === option}
                            onChange={() => setQuestion(index, { correctAnswer: option })}
                            className="h-4 w-4"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={checkboxAnswer.includes(option)}
                            onChange={() => toggleCheckboxCorrect(index, option)}
                            className="h-4 w-4"
                          />
                        )}
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index, optionIndex)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {question.type === "multiple_choice"
                      ? "Select the one correct option for automatic grading."
                      : "Check every correct option. Student answers must match exactly for full points."}
                  </p>
                </div>
              ) : null}

              {question.type === "true_false" ? (
                <div className="mt-5">
                  <label className="mb-3 block text-sm font-medium text-gray-700">Correct answer</label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: "True", value: true },
                      { label: "False", value: false },
                    ].map((item) => (
                      <label
                        key={String(item.value)}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${
                          question.correctAnswer === item.value ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={question.correctAnswer === item.value}
                          onChange={() => setQuestion(index, { correctAnswer: item.value })}
                        />
                        <span className="font-medium text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {question.type === "short_answer" ? (
                <div className="mt-5">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Suggested answer / answer key</label>
                  <input
                    type="text"
                    value={typeof question.correctAnswer === "string" ? question.correctAnswer : ""}
                    onChange={(e) => setQuestion(index, { correctAnswer: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional answer key for manual checking"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Short answer questions are saved with an answer key, but they can be reviewed manually by the teacher.
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
