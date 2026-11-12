"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { continueAfterAuth } from "@/lib/verified";
import { EyeIcon, EyeOffIcon } from "./icons";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const resetDone = searchParams.get("reset") === "1";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      const account = await login({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      });
      const next = searchParams.get("next");
      router.push(continueAfterAuth(account, next || "/account"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in.");
    } finally {
      setPending(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-[4px] border-[0.8px] border-line bg-white px-3 py-3 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {resetDone && !error && (
        <p className="rounded-[2px] bg-ink/5 px-3 py-2 text-[13px] text-ink">
          Password updated. Log in with your new password.
        </p>
      )}
      {error && (
        <p className="rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">{error}</p>
      )}
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Email Address
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="layla@email.com"
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Password
        </span>
        <span className="relative mt-1.5 block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
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
        <span className="mt-2 flex justify-end">
          <Link href="/forgot-password" className="text-[12px] text-wine">
            Forgot password?
          </Link>
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log In"}
      </button>
      <p className="text-center text-[13px] text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-wine">
          Sign up free
        </Link>
      </p>
    </form>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
