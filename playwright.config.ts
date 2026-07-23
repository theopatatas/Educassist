import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "npm --prefix backend run dev",
          url: "http://127.0.0.1:4000/health",
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            ...process.env,
            NODE_ENV: "test",
            DB_NAME_TEST: process.env.DB_NAME_TEST || "educassist_test",
          },
        },
        {
          command: "npm run dev",
          url: "http://127.0.0.1:3000/login",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
