import type { JwtPayload } from "jsonwebtoken";
import type { Request } from "express";
import type { AccessTokenPayload } from "../utils/jwt";

export type UserRole =
  | "super_admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

export type RouteRole =
  | "admin"
  | "managed_admin"
  | "teacher"
  | "student"
  | "parent";

export type AuthenticatedUser = JwtPayload & AccessTokenPayload;

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export type ScopedAuthenticatedRequest<TScope extends object> =
  AuthenticatedRequest & TScope;
