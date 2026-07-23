"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

type AttemptStatus = "Not Started" | "In Progress" | "Submitted";
type QuestionType = "multiple_choice" | "checkbox" | "true_false" | "short_answer";

type StudentQuestion = {
  id: number;
  type: QuestionType;
  text: string;
  options: string[];
  points: number;
  answer: unknown;
  isCorrect: boolean | null;
  correctAnswer: unknown;
  earnedPoints: number | null;
};

type QuizDetail = {
  id: number;
  title: string;
  dueDate?: string | null;
  timeLimit?: number | null;
  className: string;
  subjectName: string;
  myAttempt: AttemptStatus;
  publishResults?: boolean;
  myScore: number;
  penaltyPoints?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  questions: StudentQuestion[];
};

type SubmitResult = {
  score: number;
  earnedPoints: number;
  totalPoints: number;
  manualReviewCount: number;
  penaltyPoints?: number;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeAnswer(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (typeof raw === "boolean") return raw;
  if (Array.isArray(raw)) return raw;
  return null;
}

export default function StudentTakeQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = String(params?.id ?? "");
  const autoSubmittedRef = useRef(false);
  const submissionInFlightRef = useRef(false);

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) return;
    let active = true;

    const loadQuiz = async () => {
      try {
        const { data } = await api.get(`/api/quizzes/${quizId}`);
        if (!active) return;
        let row = (data?.quiz as QuizDetail) ?? null;
        if (row && row.myAttempt !== "Submitted" && !row.publishResults) {
          await api.post(`/api/quizzes/${quizId}/start`);
          const refreshed = await api.get(`/api/quizzes/${quizId}`);
          if (!active) return;
          row = (refreshed.data?.quiz as QuizDetail) ?? row;
        }
        setQuiz(row);
        const nextAnswers: Record<number, unknown> = {};
        for (const question of row?.questions ?? []) {
          nextAnswers[question.id] = normalizeAnswer(question.answer);
        }
        setAnswers(nextAnswers);
      } catch (err: unknown) {
        if (!active) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load quiz.";
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadQuiz();

    return () => {
      active = false;
    };
  }, [quizId]);

  useEffect(() => {
    if (!quiz?.timeLimit || !quiz.startedAt || quiz.myAttempt === "Submitted") {
      setTimeLeft(null);
      return;
    }

    const startedAt = new Date(quiz.startedAt).getTime();
    const deadline = startedAt + Number(quiz.timeLimit) * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [quiz, result]);

  const handleSubmit = useCallback(async () => {
    if (
      !quiz ||
      submissionInFlightRef.current ||
      quiz.myAttempt === "Submitted"
    )
      return;
    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const payload = quiz.questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? null,
      }));
      const { data } = await api.post(`/api/quizzes/${quiz.id}/submit`, { answers: payload });
      const nextResult = (data?.result as SubmitResult) ?? null;
      setResult(nextResult);
      const refreshed = await api.get(`/api/quizzes/${quiz.id}`);
      setQuiz((refreshed.data?.quiz as QuizDetail) ?? null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit quiz.";
      setError(message);
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [answers, quiz]);

  useEffect(() => {
    if (timeLeft !== 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void handleSubmit();
  }, [handleSubmit, timeLeft]);

  const answeredCount = useMemo(
    () =>
      quiz?.questions.filter((question) => {
        const answer = answers[question.id];
        if (Array.isArray(answer)) return answer.length > 0;
        return answer !== null && answer !== undefined && String(answer).trim() !== "";
      }).length ?? 0,
    [answers, quiz]
  );
  const isReviewMode = quiz?.myAttempt === "Submitted";
  const reviewSummary = useMemo(() => {
    const questions = quiz?.questions ?? [];
    const autoGraded = questions.filter((question) => question.type !== "short_answer");
    const correct = autoGraded.filter((question) => question.isCorrect === true).length;
    const wrong = autoGraded.filter((question) => question.isCorrect === false).length;
    const rawEarnedPoints = autoGraded.reduce((sum, question) => sum + Number(question.earnedPoints ?? 0), 0);
    const totalPoints = autoGraded.reduce((sum, question) => sum + Number(question.points ?? 0), 0);
    const penaltyPoints = Number(quiz?.penaltyPoints ?? result?.penaltyPoints ?? 0);
    const earnedPoints = Math.max(0, rawEarnedPoints - penaltyPoints);
    return { correct, wrong, earnedPoints, totalPoints, penaltyPoints };
  }, [quiz, result?.penaltyPoints]);

  const setAnswer = (questionId: number, value: unknown) => {
    if (quiz?.myAttempt === "Submitted") return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxAnswer = (questionId: number, option: string) => {
    const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : [];
    const exists = current.includes(option);
    setAnswer(
      questionId,
      exists ? current.filter((item) => item !== option) : [...current, option]
    );
  };

  const handleBackClick = () => {
    if (quiz?.myAttempt === "In Progress") {
      setShowLeaveWarning(true);
      return;
    }
    router.push("/student/quiz-center");
  };

  const confirmLeaveQuiz = async () => {
    if (!quiz || quiz.myAttempt !== "In Progress" || isLeaving) return;
    setIsLeaving(true);
    setError("");
    try {
      await api.post(`/api/quizzes/${quiz.id}/leave`);
      router.push("/student/quiz-center");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to leave quiz.";
      setError(message);
      setShowLeaveWarning(false);
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-gray-500">Loading quiz...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={handleBackClick}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quiz Center
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{quiz?.title || "Quiz"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {quiz?.subjectName || "Subject"} • {quiz?.className || "Class"} • {quiz?.questions.length ?? 0} questions
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-400">Progress</p>
            <p className="font-bold text-gray-800">
              {answeredCount}/{quiz?.questions.length ?? 0} answered
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase text-indigo-600">{isReviewMode ? "Status" : "Timer"}</p>
            <p className="inline-flex items-center gap-2 font-bold text-indigo-900">
              <Clock className="h-4 w-4" />
              {isReviewMode ? "Submitted" : timeLeft === null ? "No limit" : formatTime(timeLeft)}
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {isReviewMode ? (
        <div className="mb-6 rounded-[28px] border border-gray-200 bg-white">
          <div className="px-6 py-8 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Quiz Submitted Successfully
              </p>

              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Final Score</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                {reviewSummary.earnedPoints}
                <span className="mx-2 text-gray-300">/</span>
                <span>{reviewSummary.totalPoints}</span>
                <span className="ml-3 text-green-700">({quiz?.myScore ?? 0}%)</span>
              </h2>

              <div className="mx-auto mt-5 h-px w-full max-w-md bg-gray-200" />

              <p className="mt-4 text-sm text-gray-600">
                Your quiz has been checked. Review the answers below to see your results.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-5">
        {quiz?.questions.map((question, index) => {
          const answer = answers[question.id];
          const checkboxAnswer = Array.isArray(answer) ? answer : [];
          const correctAnswer = question.correctAnswer;
          const correctOptions = Array.isArray(correctAnswer) ? correctAnswer : [];
          const questionStatus =
            question.type === "short_answer"
              ? "Pending Review"
              : question.isCorrect
              ? "Correct"
              : "Incorrect";
          const questionStatusClass =
            question.type === "short_answer"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : question.isCorrect
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200";

          return (
            <div key={question.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Question {index + 1} • {question.points} point{question.points !== 1 ? "s" : ""}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-800">{question.text}</h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-600">
                  {question.type.replaceAll("_", " ")}
                </span>
              </div>

              {isReviewMode ? (
                <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${questionStatusClass}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {question.type === "short_answer" ? null : question.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>{questionStatus}</span>
                  </div>
                  <div className="text-sm font-semibold">
                    {question.type === "short_answer"
                      ? `Points: - / ${question.points}`
                      : `Points: ${Number(question.earnedPoints ?? 0)}/${question.points}`}
                  </div>
                </div>
              ) : null}

              {question.type === "multiple_choice" ? (
                <div className="space-y-3">
                  {question.options.length > 0 ? (
                    question.options.map((option) => {
                      const isSelected = answer === option;
                      const isCorrectOption = correctAnswer === option;
                      const reviewClass = !isReviewMode
                        ? "border-gray-200 hover:bg-gray-50"
                        : isCorrectOption
                        ? "border-green-300 bg-green-50"
                        : isSelected
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white";
                      return (
                        <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${reviewClass}`}>
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            checked={isSelected}
                            onChange={() => setAnswer(question.id, option)}
                            disabled={isReviewMode}
                          />
                          <span className="flex-1 text-sm text-gray-700">{option}</span>
                          {isReviewMode && isCorrectOption ? <span className="text-green-700">✅</span> : null}
                          {isReviewMode && isSelected && !isCorrectOption ? <span className="text-red-700">❌</span> : null}
                        </label>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      No choices were added for this multiple choice question yet.
                    </div>
                  )}
                </div>
              ) : null}

              {question.type === "checkbox" ? (
                <div className="space-y-3">
                  {question.options.length > 0 ? (
                    question.options.map((option) => {
                      const isSelected = checkboxAnswer.includes(option);
                      const isCorrectOption = correctOptions.includes(option);
                      const reviewClass = !isReviewMode
                        ? "border-gray-200 hover:bg-gray-50"
                        : isCorrectOption
                        ? "border-green-300 bg-green-50"
                        : isSelected
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white";
                      return (
                        <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${reviewClass}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCheckboxAnswer(question.id, option)}
                            disabled={isReviewMode}
                          />
                          <span className="flex-1 text-sm text-gray-700">{option}</span>
                          {isReviewMode && isCorrectOption ? <span className="text-green-700">✅</span> : null}
                          {isReviewMode && isSelected && !isCorrectOption ? <span className="text-red-700">❌</span> : null}
                        </label>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      No choices were added for this checkbox question yet.
                    </div>
                  )}
                </div>
              ) : null}

              {question.type === "true_false" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[true, false].map((value) => {
                    const isSelected = answer === value;
                    const isCorrectOption = correctAnswer === value;
                    const reviewClass = !isReviewMode
                      ? "border-gray-200 hover:bg-gray-50"
                      : isCorrectOption
                      ? "border-green-300 bg-green-50"
                      : isSelected
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white";
                    return (
                      <label key={String(value)} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${reviewClass}`}>
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={isSelected}
                          onChange={() => setAnswer(question.id, value)}
                          disabled={isReviewMode}
                        />
                        <span className="flex-1 text-sm text-gray-700">{value ? "True" : "False"}</span>
                        {isReviewMode && isCorrectOption ? <span className="text-green-700">✅</span> : null}
                        {isReviewMode && isSelected && !isCorrectOption ? <span className="text-red-700">❌</span> : null}
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {question.type === "short_answer" ? (
                <div>
                  <textarea
                    rows={4}
                    value={typeof answer === "string" ? answer : ""}
                    onChange={(e) => setAnswer(question.id, e.target.value)}
                    disabled={isReviewMode}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    placeholder="Type your answer here"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {isReviewMode
                      ? "Short answer items are kept read-only and may still need manual checking."
                      : "Short answer items may be reviewed manually by your teacher."}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!isReviewMode ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      ) : null}

      {showLeaveWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Leave quiz?</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Leaving the quiz while taking it will deduct points from your score.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                If you proceed, you will return to Quiz Center and this penalty will apply every time you leave an active attempt.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveWarning(false)}
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
                disabled={isLeaving}
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={confirmLeaveQuiz}
                className="flex-1 rounded-2xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLeaving}
              >
                {isLeaving ? "Leaving..." : "Leave Quiz"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
