import { expect, test, type Page } from "@playwright/test";
import { e2eAccount, type E2ERole } from "../fixtures/e2e-accounts";

async function login(page: Page, role: E2ERole) {
  const account = e2eAccount(role);
  test.skip(
    !account,
    `Set E2E_${role.toUpperCase()}_IDENTIFIER and E2E_${role.toUpperCase()}_PASSWORD`,
  );
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(account!.identifier);
  await page.getByPlaceholder("••••••••").fill(account!.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("invalid login displays an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("invalid@example.test");
  await page.getByPlaceholder("••••••••").fill("invalid-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText(/invalid credentials|invalid email or password/i),
  ).toBeVisible();
});

for (const role of ["admin", "teacher", "student"] as const) {
  test(`${role} login succeeds`, async ({ page }) => {
    await login(page, role);
    await expect(page).toHaveURL(
      new RegExp(role === "admin" ? "/admin|/staff-admin" : `/${role}`),
    );
  });
}

test("teacher cannot access Super Admin pages", async ({ page }) => {
  await login(page, "teacher");
  await page.goto("/admin");
  await expect(page).toHaveURL(/unauthorized/);
});

test("admin can open the create-student form", async ({ page }) => {
  await login(page, "admin");
  const studentRoute = page.url().includes("/staff-admin")
    ? "/staff-admin/students"
    : "/admin/students";
  await page.goto(studentRoute);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(
    page.getByRole("heading", { name: "Create Student" }),
  ).toBeVisible();
});

test("an admin account action waits for explicit confirmation", async ({
  page,
}) => {
  await login(page, "admin");
  test.skip(
    !page.url().includes("/admin"),
    "This confirmation flow is available only to the Super Admin.",
  );

  await page.goto("/admin/accounts");
  const passwordInput = page.getByLabel(/super admin password/i);
  if (await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: /continue|confirm/i }).click();
  }

  const actionButton = page
    .getByRole("button", { name: /activate|deactivate|suspend/i })
    .first();
  test.skip(
    !(await actionButton.isVisible().catch(() => false)),
    "No administrator action is available in the test account.",
  );

  let mutationRequests = 0;
  page.on("request", (request) => {
    if (
      request.method() !== "GET" &&
      /\/api\/(?:admins|users)\//.test(request.url())
    ) {
      mutationRequests += 1;
    }
  });

  await actionButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(mutationRequests).toBe(0);

  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(mutationRequests).toBe(0);
});

test("logout returns to login", async ({ page }) => {
  await login(page, "teacher");
  await page.getByRole("button", { name: /profile|account/i }).click();
  await page.getByText("Sign Out", { exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
