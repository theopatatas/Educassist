import axios from "axios";
import type { AxiosInstance } from "axios";
import { getLocal } from "../storage/local";
import {
  logoutForSessionTimeout,
  markUserActivity,
  AUTH_KEY,
} from "../../features/auth/session";
import { useAuthStore } from "../../features/auth/tokenStore";

type SavedAuth = {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    role: "super_admin" | "admin" | "teacher" | "student" | "parent";
  };
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(baseURL: string) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const auth = getLocal<SavedAuth>(AUTH_KEY);
    if (!auth?.refreshToken || !auth.user) return null;

    const refreshClient = axios.create({ baseURL, withCredentials: true });
    const { data } = await refreshClient.post<{
      ok: boolean;
      accessToken: string;
      refreshToken: string;
      user: SavedAuth["user"];
    }>("/api/auth/refresh", {
      refreshToken: auth.refreshToken,
    });

    useAuthStore.getState().setAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user!,
    });

    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function attachAuthInterceptor(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const auth = getLocal<SavedAuth>(AUTH_KEY);
    if (auth?.accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    if (typeof window !== "undefined" && auth?.accessToken) {
      markUserActivity();
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      if (typeof window !== "undefined") {
        markUserActivity();
      }
      return response;
    },
    async (error) => {
      const status = error?.response?.status as number | undefined;
      const originalRequest = error?.config;
      const requestUrl = String(originalRequest?.url ?? "");
      const isAuthRequest =
        requestUrl.includes("/api/auth/login") ||
        requestUrl.includes("/api/auth/register") ||
        requestUrl.includes("/api/auth/forgot-password") ||
        requestUrl.includes("/api/auth/refresh");

      if (
        status === 401 &&
        typeof window !== "undefined" &&
        !isAuthRequest &&
        !originalRequest?._retry
      ) {
        originalRequest._retry = true;
        try {
          const nextAccessToken = await refreshAccessToken(
            client.defaults.baseURL ?? "",
          );
          if (nextAccessToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
            return client(originalRequest);
          }
        } catch {
          logoutForSessionTimeout();
        }
      }

      if (status === 401 && typeof window !== "undefined" && !isAuthRequest) {
        logoutForSessionTimeout();
      }
      return Promise.reject(error);
    },
  );
}
