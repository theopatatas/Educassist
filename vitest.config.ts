import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    env: {
      NODE_ENV: "test",
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_USER: "root",
      DB_PASS: "",
      DB_NAME: "educassist_db",
      DB_NAME_TEST: "educassist_test",
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/**/*.ts",
        "src/features/auth/**/*.ts",
        "backend/src/utils/**/*.ts",
        "backend/src/modules/auth/auth.schemas.ts",
      ],
      exclude: ["**/*.d.ts", "**/*.config.*", "tests/**"],
      thresholds: { lines: 20, functions: 20, statements: 20, branches: 12 },
    },
  },
});
