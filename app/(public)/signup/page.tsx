"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { registerApi } from "@/src/features/auth/api";

const schema = z
  .object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  lrn: z.string().min(4),
  yearLevel: z.string().min(1),
  middleName: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  guardianContact: z.string().min(5),
  sectionId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hydrated && user) router.replace("/login");
  }, [hydrated, user, router]);

  const onSubmit = async (values: FormValues) => {
    const { confirmPassword, ...payload } = values;
    const rawSection = payload.sectionId.trim();
    const parsedSectionId = Number(rawSection);
    await registerApi({
      ...payload,
      sectionId: Number.isFinite(parsedSectionId) ? parsedSectionId : undefined,
      sectionName: rawSection || undefined,
    });
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-5xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="mt-2 text-sm text-zinc-600">Start using EducAssist in minutes.</p>
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900">What you’ll need</p>
              <ul className="mt-3 list-disc pl-5">
                <li>LRN (Learner Reference Number)</li>
                <li>Year level</li>
                <li>Guardian contact</li>
              </ul>
            </div>
            <p className="mt-6 text-sm text-zinc-600">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-zinc-900 hover:underline">
                Sign in
              </a>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First name</label>
              <input
                type="text"
                {...register("firstName")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Juan"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Last name</label>
              <input
                type="text"
                {...register("lastName")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Dela Cruz"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Middle name (optional)</label>
              <input
                type="text"
                {...register("middleName")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Santos"
              />
            </div>
            <div>
              <label className="text-sm font-medium">LRN</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              {...register("lrn")}
              onInput={(e) => {
                const target = e.currentTarget;
                target.value = target.value.replace(/[^0-9]/g, "");
              }}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="1234567890"
            />
              {errors.lrn && <p className="mt-1 text-xs text-red-600">{errors.lrn.message}</p>}
            </div>
          <div>
            <label className="text-sm font-medium">Year level</label>
            <input
              type="text"
              {...register("yearLevel")}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Grade 10"
            />
            {errors.yearLevel && (
              <p className="mt-1 text-xs text-red-600">{errors.yearLevel.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Section</label>
            <input
              type="text"
              {...register("sectionId")}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Section"
            />
            {errors.sectionId && (
              <p className="mt-1 text-xs text-red-600">{errors.sectionId.message}</p>
            )}
          </div>
            <div>
              <label className="text-sm font-medium">Birthday (optional)</label>
              <input
                type="date"
                {...register("birthDate")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gender (optional)</label>
              <select
                {...register("gender")}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                defaultValue=""
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
            <label className="text-sm font-medium">Guardian number</label>
              <input
                type="text"
                {...register("guardianContact")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="09xxxxxxxxx"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
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
            <div>
              <label className="text-sm font-medium">Confirm password</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("confirmPassword")}
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
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isSubmitting ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
