"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/hooks";
import { requestRegisterOtpApi, verifyRegisterOtpApi } from "@/src/features/auth/api";

const schema = z
  .object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  lrn: z.string().min(4),
  yearLevel: z.string().min(1),
  middleName: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  guardianName: z.string().min(1),
  guardianContact: z.string().min(5),
  sectionId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1, " ").min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, " ").min(8, "Confirm password must be at least 8 characters"),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;
type SignupPayload = {
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
};

export default function SignUpPage() {
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<SignupPayload | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (hydrated && user) router.replace("/login");
  }, [hydrated, user, router]);

  const buildSignupPayload = (values: FormValues): SignupPayload => {
    const { confirmPassword, ...payload } = values;
    const rawSection = payload.sectionId.trim();
    const parsedSectionId = Number(rawSection);
    return {
      ...payload,
      sectionId: Number.isFinite(parsedSectionId) ? parsedSectionId : undefined,
      sectionName: rawSection || undefined,
    };
  };

  const onSubmit = async (values: FormValues) => {
    const signupPayload = buildSignupPayload(values);
    setSignupError("");
    setSignupStatus("");
    setOtpDigits(Array(6).fill(""));
    try {
      const result = await requestRegisterOtpApi(signupPayload);
      setPendingSignup(signupPayload);
      setPendingEmail(result.email || signupPayload.email);
      setSignupStatus(result.message || "OTP sent to your email address.");
      setOtpModalOpen(true);
    } catch (err: any) {
      setSignupError(err?.response?.data?.message || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpDigits.join("");
    if (!pendingEmail || otp.length !== 6) {
      setSignupError("Enter the OTP sent to your email.");
      return;
    }

    setOtpSubmitting(true);
    setSignupError("");
    setSignupStatus("");
    try {
      await verifyRegisterOtpApi({ email: pendingEmail, otp: otp.trim() });
      logout();
      router.replace("/login");
    } catch (err: any) {
      setSignupError(err?.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleOtpSlotChange = (index: number, value: string) => {
    const nextValue = value.replace(/[^0-9]/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue || "";
    setOtpDigits(nextDigits);

    if (nextValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        const nextDigits = [...otpDigits];
        nextDigits[index] = "";
        setOtpDigits(nextDigits);
        return;
      }
      if (index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;
    const nextDigits = Array(6)
      .fill("")
      .map((_, index) => pasted[index] ?? "");
    setOtpDigits(nextDigits);
    const focusIndex = Math.min(pasted.length - 1, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleResendOtp = async () => {
    if (!pendingSignup) return;

    setOtpResending(true);
    setSignupError("");
    setSignupStatus("");
    try {
      const result = await requestRegisterOtpApi(pendingSignup);
      setPendingEmail(result.email || pendingSignup.email);
      setSignupStatus(result.message || "OTP resent to your email address.");
    } catch (err: any) {
      setSignupError(err?.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setOtpResending(false);
    }
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
                <li>Parent/Guardian name</li>
                <li>Parent/Guardian contact number</li>
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
              <label className="text-sm font-medium">Parent/Guardian name</label>
              <input
                type="text"
                {...register("guardianName")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Maria Santos"
              />
              {errors.guardianName && (
                <p className="mt-1 text-xs text-red-600">{errors.guardianName.message}</p>
              )}
            </div>
            <div>
            <label className="text-sm font-medium">Parent/Guardian number</label>
              <input
                type="text"
                {...register("guardianContact")}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="09123456789"
              />
            </div>
            <div className="md:col-span-2">
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
              {errors.password?.message?.trim() ? (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              ) : null}
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
              {errors.confirmPassword?.message?.trim() ? (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isSubmitting ? "Sending OTP…" : "Create account"}
              </button>
              {signupError ? <p className="mt-2 text-xs text-red-600">{signupError}</p> : null}
              {signupStatus ? <p className="mt-2 text-xs text-green-700">{signupStatus}</p> : null}
            </div>
          </form>
        </div>
      </div>

      {otpModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-100 bg-[radial-gradient(circle_at_top,#f4f4f5,transparent_60%)] px-6 py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-semibold text-white">
                OTP
              </div>
              <h2 className="mt-4 text-center text-2xl font-semibold text-zinc-950">Verify your email</h2>
              <p className="mt-2 text-center text-sm leading-6 text-zinc-600">
                Enter the 6-digit code sent to <span className="font-medium text-zinc-900">{pendingEmail}</span>.
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      otpInputRefs.current[index] = node;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={otpDigits[index] ?? ""}
                    onChange={(e) => handleOtpSlotChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="h-14 w-12 rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 sm:w-14"
                  />
                ))}
              </div>

              {signupError ? <p className="mt-4 text-center text-xs text-red-600">{signupError}</p> : null}
              {signupStatus ? <p className="mt-4 text-center text-xs text-green-700">{signupStatus}</p> : null}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpSubmitting}
                className="mt-6 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {otpSubmitting ? "Verifying…" : "Verify Code"}
              </button>

              <div className="mt-4 text-center text-sm text-zinc-500">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResending}
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline disabled:opacity-60"
                >
                  {otpResending ? "Resending…" : "Resend Code"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="mt-5 w-full text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
