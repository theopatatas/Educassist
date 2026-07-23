import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../../app/(public)/login/page";

const replace = vi.fn();
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/src/features/auth/hooks", () => ({
  useAuth: () => ({ login, user: null, hydrated: true }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    login.mockReset();
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("validates required credentials before calling login", async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("shows the backend login error", async () => {
    login.mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "incorrect" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("redirects a successful teacher login", async () => {
    login.mockResolvedValueOnce({ user: { role: "teacher" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "teacher@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/teacher"));
  });
});
