"use client";

import Link from "next/link";
import { CheckIcon } from "./icons";

export default function ListingPublishedView() {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[400px] text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-sage/15">
          <CheckIcon className="size-11 text-sage" />
        </div>
        <h1 className="pt-6 font-display text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink sm:text-[38px]">
          Listing Published
        </h1>
        <p className="pt-3 text-[15px] leading-[24px] text-muted">
          Your piece is now live on Going Twice. Buyers can discover it in the collection.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/account/uploads"
            className="rounded-[2px] bg-wine px-7 py-3.5 text-[15px] font-medium text-white"
          >
            View My Listings
          </Link>
          <Link
            href="/sell"
            className="rounded-[2px] border-[0.8px] border-wine px-7 py-3.5 text-[15px] font-medium text-wine"
          >
            List Another Piece
          </Link>
        </div>
      </div>
    </section>
  );
}
