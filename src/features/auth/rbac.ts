import type { Role } from "./types";

export function canAccess(required: Role, actual?: Role | null) {
  return actual === required;
}

export function roleHome(role: Role) {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "admin":
      return "/staff-admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    default:
      return "/student";
  }
}
