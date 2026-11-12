"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EyeIcon, EyeOffIcon } from "./icons";

export default function SignUpForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await register({
        full_name: String(form.get("full_name") || ""),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
        phone_number: String(form.get("phone_number") || "") || undefined,
      });
      // Registration emails a code — go straight to entering it.
      router.push("/verify-email");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account.");
    } finally {
      setPending(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-[4px] border-[0.8px] border-line bg-white px-3 py-3 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {error && (
        <p className="rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">{error}</p>
      )}
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Full Name
        </span>
        <input name="full_name" required placeholder="Layla Hassan" className={field} />
      </label>
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
          Phone
        </span>
        <input name="phone_number" placeholder="0101 234 5678" className={field} />
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
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create Account"}
      </button>
      <p className="text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-wine">
          Log in
        </Link>
      </p>
    </form>
  );
}
