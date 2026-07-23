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
  guardianName?: string | null;
  guardianContact?: string | null;
  sectionId?: number;
  sectionName?: string | null;
}) {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  return data;
}

export async function requestRegisterOtpApi(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  lrn: string;
  yearLevel: string;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  guardianName?: string | null;
  guardianContact?: string | null;
  sectionId?: number;
  sectionName?: string | null;
}) {
  const { data } = await api.post<{ ok: boolean; message: string; email: string }>("/api/auth/register/request-otp", input);
  return data;
}

export async function verifyRegisterOtpApi(input: { email: string; otp: string }) {
  const { data } = await api.post<AuthResponse>("/api/auth/register/verify-otp", input);
  return data;
}

export async function meApi() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function requestForgotPasswordOtpApi(email: string) {
  const { data } = await api.post<{ ok: boolean; message: string }>("/api/auth/forgot-password/request-otp", {
    email,
  });
  return data;
}

export async function verifyForgotPasswordOtpApi(input: {
  email: string;
  otp: string;
}) {
  const { data } = await api.post<{ ok: boolean; message: string }>("/api/auth/forgot-password/verify-otp", input);
  return data;
}

export async function resetPasswordWithOtpApi(input: {
  email: string;
  newPassword: string;
}) {
  const { data } = await api.post<{ ok: boolean; message: string }>("/api/auth/forgot-password/reset", input);
  return data;
}
