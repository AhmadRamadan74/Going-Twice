"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, authService } from "@/lib/api";

const field =
  "mt-1.5 w-full rounded-[4px] border-[0.8px] border-line bg-white px-3 py-3 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

export default function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await authService.forgotPassword(String(form.get("email") || ""));
      setResetLink(data?.reset_link ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send a reset link.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-5">
        <p className="rounded-[2px] bg-ink/5 px-3 py-3 text-[13px] leading-relaxed text-ink">
          If an account exists for that email, we&apos;ve sent a reset link. It expires in
          one hour.
        </p>
        {resetLink && (
          <p className="rounded-[2px] border border-line px-3 py-3 text-[13px] leading-relaxed text-muted">
            Local development — no email is sent.{" "}
            <Link href={resetLink} className="font-medium text-wine">
              Open reset link
            </Link>
          </p>
        )}
        <p className="text-center text-[13px] text-muted">
          <Link href="/login" className="font-medium text-wine">
            Back to log in
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
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Reset Link"}
      </button>
      <p className="text-center text-[13px] text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-wine">
          Log in
        </Link>
      </p>
    </form>
  );
}
