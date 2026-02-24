import type { Role } from "./types";

export function canAccess(required: Role, actual?: Role | null) {
  return actual === required;
}

export function roleHome(role: Role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    default:
      return "/student";
  }
}
