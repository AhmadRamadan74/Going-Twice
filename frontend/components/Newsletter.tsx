"use client";

import { useState } from "react";
import { ApiError, newsletterService } from "@/lib/api";
import Reveal from "./Reveal";

export default function Newsletter() {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    setStatus("pending");
    try {
      await newsletterService.subscribe({ email });
      setStatus("done");
      setMessage("You're on the list.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not subscribe.");
    }
  }

  return (
    <section className="bg-ink py-12 sm:py-16">
      <Reveal variant="fade">
        <div className="mx-auto w-full max-w-[580px] px-4 text-center sm:px-6">
          <p className="eyebrow text-sage">Stay in the Loop</p>

          <h2 className="pt-4 font-display text-[26px] font-medium leading-[1.2] tracking-[-0.01em] text-cream sm:text-[32px] md:text-[36px]">
            Pieces Worth Knowing About
          </h2>

          <p className="pt-3 text-[13px] leading-[20px] text-cream/55 sm:text-[14px] sm:leading-[21px]">
            New arrivals and curated stories — delivered occasionally, never excessively.
          </p>

          {status === "done" ? (
            <p className="pt-7 text-[14px] text-cream">{message}</p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-2 pt-7 sm:flex-row sm:gap-0 sm:pt-8"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="Your email address"
                aria-label="Your email address"
                className="h-[48px] min-w-0 flex-1 rounded-[2px] border-[0.8px] border-white/20 bg-white/10 px-4 text-[14px] text-cream outline-none placeholder:text-white/35 focus:border-white/40 sm:h-[50.6px] sm:rounded-none sm:border-y-[0.8px] sm:border-l-[0.8px] sm:border-r-0"
              />
              <button
                type="submit"
                disabled={status === "pending"}
                className="theme-cta h-[48px] cursor-pointer rounded-[2px] bg-wine px-6 text-[13px] font-medium leading-[19.5px] text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-[50.6px] sm:rounded-none"
              >
                {status === "pending" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="pt-3 text-[13px] text-cream/70">{message}</p>
          )}
        </div>
      </Reveal>
    </section>
  );
}
