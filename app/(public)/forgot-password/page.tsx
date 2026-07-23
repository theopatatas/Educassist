"use client";

import { useRef, useState } from "react";
import {
  requestForgotPasswordOtpApi,
  resetPasswordWithOtpApi,
  verifyForgotPasswordOtpApi,
} from "@/src/features/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const onRequestOtp = async () => {
    setError("");
    setStatus("");
    setOtpVerified(false);
    setOtpDigits(Array(6).fill(""));
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setLoadingOtp(true);
      const res = await requestForgotPasswordOtpApi(email.trim());
      setStatus(res.message || "If the email exists, an OTP has been sent.");
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoadingOtp(false);
    }
  };

  const onVerifyOtp = async () => {
    setError("");
    setStatus("");
    const otp = otpDigits.join("");
    if (!email.trim() || otp.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    try {
      setLoadingVerify(true);
      const res = await verifyForgotPasswordOtpApi({
        email: email.trim(),
        otp,
      });
      setStatus(res.message || "OTP verified.");
      setOtpVerified(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to verify OTP");
    } finally {
      setLoadingVerify(false);
    }
  };

  const onResetPassword = async () => {
    setError("");
    setStatus("");
    if (!email.trim() || !otpVerified || !newPassword.trim()) {
      setError("Verify the OTP first, then enter your new password.");
      return;
    }

    try {
      setLoadingReset(true);
      const res = await resetPasswordWithOtpApi({
        email: email.trim(),
        newPassword: newPassword.trim(),
      });
      setStatus(res.message || "Password reset successful.");
      setOtpDigits(Array(6).fill(""));
      setNewPassword("");
      setOtpSent(false);
      setOtpVerified(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoadingReset(false);
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
    otpInputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-200/60">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white">
          OTP
        </div>
        <h1 className="mt-4 text-center text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-zinc-600">
          Reset your student account securely with email OTP verification.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={otpSent}
              className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:bg-zinc-50"
              placeholder="you@example.com"
            />
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={onRequestOtp}
              disabled={loadingOtp}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loadingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          ) : null}

          {otpSent ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
              <p className="text-sm leading-5 text-zinc-500">
                Enter the 6-digit code sent to your email address.
              </p>

              <div className="mt-4 flex justify-center gap-2">
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
                    disabled={otpVerified}
                    className="h-14 w-12 rounded-2xl border border-zinc-200 bg-white text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={loadingVerify || otpVerified}
                className="mt-5 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {otpVerified ? "OTP Verified" : loadingVerify ? "Verifying OTP..." : "Verify OTP"}
              </button>

              <div className="mt-3 text-center text-sm text-zinc-500">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={onRequestOtp}
                  disabled={loadingOtp}
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline disabled:opacity-60"
                >
                  {loadingOtp ? "Resending..." : "Resend OTP"}
                </button>
              </div>
            </div>
          ) : null}

          {otpVerified ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
              <div>
                <label className="text-sm font-medium">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <button
                type="button"
                onClick={onResetPassword}
                disabled={loadingReset}
                className="mt-5 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {loadingReset ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          ) : null}

          {status ? <p className="text-center text-xs text-green-700">{status}</p> : null}
          {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          Back to{" "}
          <a href="/login" className="font-medium text-zinc-900 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
