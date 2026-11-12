"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, contactService } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function ContactFormInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await contactService.send({
        full_name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        subject: String(form.get("subject") || "") || "General enquiry",
        message: String(form.get("message") || ""),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[4px] border-[0.8px] border-line bg-white p-8 text-center sm:p-10">
        <p className="eyebrow text-wine">Sent</p>
        <h2 className="pt-3 font-display text-[28px] font-medium text-ink">
          We&apos;ll be in touch
        </h2>
        <p className="mx-auto max-w-[380px] pt-3 text-[14px] leading-[22px] text-muted">
          Thanks for writing. Our team reads every message and will reply as soon as we can.
        </p>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-[2px] border-[0.8px] border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[4px] border-[0.8px] border-line bg-white p-6 sm:p-8"
    >
      {error && <p className="text-[13px] text-wine">{error}</p>}
      <label className="block">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
          Name <span className="text-wine">*</span>
        </span>
        <input name="name" required defaultValue={user?.full_name} className={field} />
      </label>
      <label className="block">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
          Email <span className="text-wine">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          defaultValue={user?.email}
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
          Subject
        </span>
        <input
          name="subject"
          className={field}
          defaultValue={searchParams.get("subject") || ""}
          placeholder="Buying, selling, partnership…"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
          Message <span className="text-wine">*</span>
        </span>
        <textarea name="message" required rows={5} className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[2px] bg-wine px-7 py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

export default function ContactForm() {
  return (
    <Suspense>
      <ContactFormInner />
    </Suspense>
  );
}
