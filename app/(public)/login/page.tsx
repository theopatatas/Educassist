"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { useAuth } from "@/src/features/auth/hooks";
import { roleHome } from "@/src/features/auth/rbac";

const schema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, hydrated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (hydrated && user) router.replace(roleHome(user.role));
  }, [hydrated, user, router]);

  const onSubmit = async (values: FormValues) => {
    setLoginError("");
    try {
      const res = await login(values.email, values.password);
      router.replace(roleHome(res.user.role));
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      setLoginError(error.response?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-wide text-zinc-500">EDUCASSIST</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-600">Access your dashboard</p>
          {searchParams.get("reason") === "session-timeout" ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Session time out. Please log in again.
            </p>
          ) : null}
        </header>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="text"
              {...register("email")}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="w-full text-sm focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs font-medium text-zinc-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
          {loginError ? <p className="text-xs text-red-600">{loginError}</p> : null}
        </form>
        <p className="mt-6 text-sm text-zinc-600">
          No account yet?{" "}
          <a href="/signup" className="font-medium text-zinc-900 hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
