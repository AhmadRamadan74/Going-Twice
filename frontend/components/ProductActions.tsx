"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { useCommerce } from "@/lib/commerce";
import WishlistButton from "./WishlistButton";

export default function ProductActions({ product }: { product: Product }) {
  const { addToCart, busy, error } = useCommerce();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<"pickup" | "shipping">("pickup");
  const [added, setAdded] = useState(false);

  const isOwnListing = !!user && !!product.sellerUserId && user.id === product.sellerUserId;
  const newChatPath = product.backendId
    ? `/messages/new?product=${product.backendId}&name=${encodeURIComponent(product.name)}&image=${encodeURIComponent(product.image)}`
    : null;
  const messageHref = newChatPath
    ? user
      ? newChatPath
      : `/login?next=${encodeURIComponent(newChatPath)}`
    : null;

  return (
    <div className="mt-8 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["pickup", "Self Pickup", "Free · Collect from seller"],
            ["shipping", "Shipping", "Arranged by seller"],
          ] as const
        ).map(([value, title, note]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDelivery(value)}
            className={`rounded-[2px] border-[0.8px] px-4 py-3 text-left ${
              delivery === value ? "border-ink bg-sand/50" : "border-line"
            }`}
          >
            <p className="text-[13px] font-medium text-ink">{title}</p>
            <p className="pt-0.5 text-[12px] text-muted">{note}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await addToCart(product, delivery);
            setAdded(true);
          }}
          className="theme-cta rounded-[2px] bg-wine px-7 py-3.5 text-center text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Adding…" : added ? "Added to Cart" : "Add to Cart"}
        </button>
        {messageHref && !isOwnListing && (
          <Link
            href={messageHref}
            className="theme-cta rounded-[2px] border-[0.8px] border-line px-7 py-3.5 text-center text-[14px] font-medium text-ink transition-colors hover:bg-sand"
          >
            Message Seller
          </Link>
        )}
        <WishlistButton
          product={product}
          className="grid size-[50px] place-items-center rounded-[2px] border-[0.8px] border-line text-ink hover:text-wine"
        />
      </div>

      {error && <p className="text-[13px] text-wine">{error}</p>}

      {added && !error && (
        <Link href="/cart" className="block text-[13px] text-wine">
          View your cart →
        </Link>
      )}
    </div>
  );
}
