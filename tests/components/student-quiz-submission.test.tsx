import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentTakeQuizPage from "../../app/(protected)/student/quiz-center/[id]/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/src/lib/http/client", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

const quiz = {
  id: 7,
  title: "Safety Quiz",
  timeLimit: null,
  className: "Class A",
  subjectName: "Science",
  myAttempt: "In Progress" as const,
  publishResults: false,
  myScore: 0,
  startedAt: null,
  completedAt: null,
  questions: [
    {
      id: 1,
      type: "true_false" as const,
      text: "The test is safe.",
      options: [],
      points: 1,
      answer: null,
      isCorrect: null,
      correctAnswer: true,
      earnedPoints: null,
    },
  ],
};

describe("student quiz submission", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.push.mockReset();
    mocks.get.mockResolvedValue({ data: { quiz } });
    mocks.post.mockResolvedValue({ data: { ok: true } });
  });

  it("does not submit on load and sends one request for rapid repeated clicks", async () => {
    let resolveSubmission:
      | ((value: { data: { result: { score: number } } }) => void)
      | undefined;
    const pendingSubmission = new Promise<{
      data: { result: { score: number } };
    }>((resolve) => {
      resolveSubmission = resolve;
    });

    mocks.post.mockImplementation((url: string) => {
      if (url.endsWith("/submit")) return pendingSubmission;
      return Promise.resolve({ data: { ok: true } });
    });

    render(<StudentTakeQuizPage />);

    const submitButton = await screen.findByRole("button", {
      name: "Submit Quiz",
    });
    expect(
      mocks.post.mock.calls.filter(([url]) => String(url).endsWith("/submit")),
    ).toHaveLength(0);

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(
      mocks.post.mock.calls.filter(([url]) => String(url).endsWith("/submit")),
    ).toHaveLength(1);

    resolveSubmission?.({ data: { result: { score: 100 } } });
    await waitFor(() =>
      expect(mocks.get.mock.calls.length).toBeGreaterThanOrEqual(3),
    );
  });
});
