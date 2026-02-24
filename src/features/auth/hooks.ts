import { useEffect, useMemo } from "react";
import { useAuthStore } from "./tokenStore";
import { loginApi, registerApi } from "./api";

export function useAuth() {
  const store = useAuthStore();
  const hydrated = store.hydrated;
  const hydrate = store.hydrate;

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return useMemo(
    () => ({
      ...store,
      login: async (email: string, password: string) => {
        const data = await loginApi(email, password);
        store.setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return data;
      },
      register: async (input: {
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
      }) => {
        const data = await registerApi(input);
        store.setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return data;
      },
      logout: () => store.clearAuth(),
    }),
    [store]
  );
}
