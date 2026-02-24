export type Role = "admin" | "teacher" | "student" | "parent";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  ok: boolean;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};
