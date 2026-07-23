import { useAuthStore } from "./tokenStore";

export const AUTH_KEY = "educassist_auth";
export const LAST_ACTIVITY_KEY = "educassist_last_activity_at";
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export function markUserActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivityAt() {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
}

export function logoutForSessionTimeout() {
  if (typeof window === "undefined") return;
  useAuthStore.getState().clearAuth();
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  if (window.location.pathname !== "/login") {
    window.location.replace("/login?reason=session-timeout");
  }
}
