"use client";

import type { Product } from "@/lib/data";
import { useCommerce } from "@/lib/commerce";
import { HeartIcon } from "./icons";

export default function WishlistButton({
  product,
  className = "absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded-full bg-white text-ink shadow-[0_1px_1.5px_rgba(0,0,0,0.1)] hover:text-wine sm:right-3 sm:top-3 sm:size-8",
}: {
  product: Product;
  className?: string;
}) {
  const { toggleWishlist, isSaved, busy } = useCommerce();
  const saved = isSaved(product.id);

  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
      aria-pressed={saved}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(product);
      }}
      className={className}
    >
      <HeartIcon className={`size-[13px] ${saved ? "fill-wine text-wine" : ""}`} />
    </button>
  );
}
