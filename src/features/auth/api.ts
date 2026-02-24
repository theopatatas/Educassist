import { api } from "../../lib/http/client";
import type { AuthResponse } from "./types";

export async function loginApi(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  return data;
}

export async function registerApi(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  lrn: string;
  yearLevel: string;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  guardianContact?: string | null;
  sectionId?: number;
  sectionName?: string | null;
}) {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  return data;
}

export async function meApi() {
  const { data } = await api.get("/api/auth/me");
  return data;
}
