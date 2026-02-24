import type { AxiosInstance } from "axios";
import { getLocal, removeLocal } from "../storage/local";

const AUTH_KEY = "educassist_auth";

export function attachAuthInterceptor(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const auth = getLocal<{ accessToken?: string }>(AUTH_KEY);
    if (auth?.accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status as number | undefined;
      if (status === 401 && typeof window !== "undefined") {
        removeLocal(AUTH_KEY);
        const currentPath = window.location.pathname;
        if (currentPath !== "/login") {
          window.location.replace("/login?reason=session-timeout");
        }
      }
      return Promise.reject(error);
    }
  );
}
