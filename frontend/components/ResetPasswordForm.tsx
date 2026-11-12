"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, authService } from "@/lib/api";
import { EyeIcon, EyeOffIcon } from "./icons";

const field =
  "mt-1.5 w-full rounded-[4px] border-[0.8px] border-line bg-white px-3 py-3 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm_password") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing or incomplete.");
      return;
    }
    setPending(true);
    try {
      await authService.resetPassword(token, password);
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update password.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-8 space-y-5">
        <p className="rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">
          This reset link is missing or incomplete. Request a new one.
        </p>
        <p className="text-center text-[13px] text-muted">
          <Link href="/forgot-password" className="font-medium text-wine">
            Forgot password?
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {error && (
        <p className="rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">{error}</p>
      )}
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          New Password
        </span>
        <span className="relative mt-1.5 block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            className={`${field} mt-0 pr-10`}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((open) => !open)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            {showPassword ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        </span>
      </label>
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Confirm Password
        </span>
        <input
          name="confirm_password"
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          className={field}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update Password"}
      </button>
      <p className="text-center text-[13px] text-muted">
        <Link href="/login" className="font-medium text-wine">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordForm() {
  return (
    <Suspense>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
