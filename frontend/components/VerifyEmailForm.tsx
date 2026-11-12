"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, takeVerificationChallenge } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const CODE_LENGTH = 6;

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready, sendVerification, verifyEmail } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  /** Guards React strict-mode double effects from burning the send cooldown. */
  const requested = useRef(false);

  const next = searchParams.get("next") || "/account";
  const code = digits.join("");

  useEffect(() => {
    if (ready && !user) {
      const dest = `/verify-email?next=${encodeURIComponent(next)}`;
      router.replace(`/login?next=${encodeURIComponent(dest)}`);
    }
  }, [ready, user, router, next]);

  useEffect(() => {
    if (user?.email_verified) router.replace(next);
  }, [user, next, router]);

  const request = useCallback(
    async (manual: boolean) => {
      setError("");
      setNotice("");
      try {
        const challenge = await sendVerification();
        applyChallenge(challenge, manual);
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          // Already sent recently — that's fine, the user has a code.
          if (manual) setError(err.message);
          return;
        }
        if (manual) {
          setError(err instanceof ApiError ? err.message : "Could not send a code.");
        }
      }
    },
    [sendVerification],
  );

  function applyChallenge(
    challenge: { resend_after_seconds?: number },
    showFreshNotice: boolean,
  ) {
    setCooldown(challenge.resend_after_seconds || 60);
    setNotice(
      showFreshNotice
        ? "We've sent a fresh code to your inbox."
        : "We've sent a code to your inbox.",
    );
  }

  // Register already emails a code. Reuse it so we don't immediately 429.
  // Only request a new one when the user lands here without a pending challenge.
  useEffect(() => {
    if (!user || user.email_verified || requested.current) return;
    requested.current = true;
    const pending = takeVerificationChallenge();
    if (pending) {
      applyChallenge(pending, false);
      return;
    }
    void request(false);
  }, [user, request]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    setDigits((prev) => {
      const nextDigits = [...prev];
      // Pasting a full code into one box fills the row.
      for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i += 1) {
        nextDigits[index + i] = clean[i];
      }
      return nextDigits;
    });
    const landing = Math.min(index + clean.length, CODE_LENGTH - 1);
    inputs.current[landing]?.focus();
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      await verifyEmail(code);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify that code.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user) {
    return <p className="mt-8 text-[14px] text-muted">Loading…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <p className="text-[14px] leading-[22px] text-muted">
        We emailed a {CODE_LENGTH}-digit code to{" "}
        <span className="font-medium text-ink">{user.email}</span>. It expires shortly.
      </p>

      {error && (
        <p className="rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">{error}</p>
      )}
      {notice && !error && (
        <p className="rounded-[2px] bg-ink/5 px-3 py-2 text-[13px] text-ink">{notice}</p>
      )}

      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={CODE_LENGTH}
            aria-label={`Digit ${index + 1}`}
            className="h-14 w-full rounded-[4px] border-[0.8px] border-line bg-white text-center text-[20px] font-medium text-ink outline-none focus:border-ink"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={pending || code.length !== CODE_LENGTH}
        className="w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Verify Email"}
      </button>

      <p className="text-center text-[13px] text-muted">
        Didn&apos;t get it?{" "}
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={() => void request(true)}
            className="font-medium text-wine"
          >
            Send a new code
          </button>
        )}
      </p>
      <p className="text-center text-[13px] text-muted">
        <Link href="/account" className="font-medium text-wine">
          Skip for now
        </Link>
      </p>
    </form>
  );
}

export default function VerifyEmailForm() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
