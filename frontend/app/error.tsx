"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="eyebrow text-muted">Something went wrong</p>
      <h1 className="pt-3 font-display text-[36px] font-medium text-ink sm:text-[48px]">
        We hit a snag
      </h1>
      <p className="max-w-[400px] pt-4 text-[14px] leading-[22px] text-muted">
        Please try again. If it keeps happening, refresh the page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[2px] bg-wine px-7 py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-[2px] border-[0.8px] border-line px-7 py-3.5 text-[14px] font-medium text-ink transition-colors hover:bg-sand"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
