import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAccountsPage from "../../app/(protected)/admin/accounts/page";

const { replace, apiGet, apiPost, apiPatch, apiDelete } = vi.hoisted(() => ({
  replace: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/src/features/auth/hooks", () => ({
  useAuth: () => ({ user: { id: 1, role: "super_admin" } }),
}));
vi.mock("@/src/lib/http/client", () => ({
  api: { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete },
}));

const managedAdmin = {
  id: 2,
  email: "admin@example.test",
  firstName: "Test",
  lastName: "Admin",
  role: "admin",
  isActive: true,
};

async function openDeactivateConfirmation() {
  render(<AdminAccountsPage />);
  fireEvent.change(screen.getByLabelText("Super Admin Password"), {
    target: { value: "super-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify and Continue" }));
  await screen.findByText("admin@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
  await screen.findByRole("dialog");
}

describe("administrator action confirmation", () => {
  beforeEach(() => {
    replace.mockReset();
    apiGet.mockReset().mockResolvedValue({ data: { users: [managedAdmin] } });
    apiPost.mockReset().mockResolvedValue({ data: { ok: true } });
    apiPatch.mockReset().mockResolvedValue({
      data: { user: { ...managedAdmin, isActive: false } },
    });
  });

  it("does not execute when opened or cancelled", async () => {
    await openDeactivateConfirmation();
    expect(apiPatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(apiPatch).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not execute when closed with Escape", async () => {
    await openDeactivateConfirmation();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(apiPatch).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("executes exactly once only after Confirm", async () => {
    await openDeactivateConfirmation();
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "super-password" },
    });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(apiPatch).toHaveBeenCalledTimes(1));
    expect(apiPatch).toHaveBeenCalledWith("/api/users/2", {
      isActive: false,
      superAdminPassword: "super-password",
    });
  });

  it("disables Confirm while processing", async () => {
    let resolveVerification: (() => void) | undefined;
    apiPost
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveVerification = () => resolve({ data: { ok: true } });
          }),
      );
    await openDeactivateConfirmation();
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "super-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
    resolveVerification?.();
    await waitFor(() => expect(apiPatch).toHaveBeenCalledTimes(1));
  });
});
