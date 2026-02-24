import { create } from "zustand";
import { getLocal, removeLocal, setLocal } from "../../lib/storage/local";
import type { AuthUser } from "./types";

const AUTH_KEY = "educassist_auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearAuth: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setAuth: (data) => {
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    setLocal(AUTH_KEY, data);
  },
  clearAuth: () => {
    set({ accessToken: null, refreshToken: null, user: null });
    removeLocal(AUTH_KEY);
  },
  hydrate: () => {
    const saved = getLocal<{ accessToken: string; refreshToken: string; user: AuthUser }>(AUTH_KEY);
    if (saved) {
      set({ accessToken: saved.accessToken, refreshToken: saved.refreshToken, user: saved.user, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));
