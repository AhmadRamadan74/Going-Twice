"use client";

import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import { ProductCard } from "./ProductGrid";
import { useCommerce } from "@/lib/commerce";

export default function WishlistView() {
  const { wishlist, loading, error } = useCommerce();

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <section className="container-page py-8 sm:py-12">
        <p className="eyebrow text-muted">Saved</p>
        <h1 className="pt-2 font-display text-[36px] font-medium text-ink">Wishlist</h1>

        {error && (
          <p className="mt-4 rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-[14px] text-muted">Loading your saved pieces…</p>
        ) : wishlist.length === 0 ? (
          <div className="mt-8 rounded-[4px] border-[0.8px] border-line bg-white px-6 py-14 text-center">
            <p className="font-display text-[24px] text-ink">Nothing saved yet</p>
            <p className="pt-2 text-[14px] text-muted">
              Tap the heart on a piece to keep it here.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white"
            >
              Browse pieces
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-8 sm:gap-4 lg:grid-cols-4">
            {wishlist.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
