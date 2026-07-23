export type E2ERole = "admin" | "teacher" | "student";

export function e2eAccount(role: E2ERole) {
  const prefix = `E2E_${role.toUpperCase()}`;
  const identifier = process.env[`${prefix}_IDENTIFIER`];
  const password = process.env[`${prefix}_PASSWORD`];
  return identifier && password ? { identifier, password } : null;
}
