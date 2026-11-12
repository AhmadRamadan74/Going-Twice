"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/data";
import { ProductCard } from "./ProductGrid";
import Reveal from "./Reveal";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name" },
] as const;

export default function CatalogView({
  products,
  emptyMessage = "No pieces match this view yet. Check back soon.",
  layout = "grid-4",
  showSort = true,
}: {
  products: Product[];
  emptyMessage?: string;
  layout?: "grid-4" | "grid-2";
  showSort?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  function onSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div>
      {showSort && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-[0.8px] border-line pb-4">
          <p className="text-[13px] text-muted">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={currentSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="cursor-pointer rounded-[2px] border-[0.8px] border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted">{emptyMessage}</p>
      ) : (
        <div
          className={`grid ${
            layout === "grid-2"
              ? "grid-cols-1 gap-6 pt-12 sm:grid-cols-2"
              : "grid-cols-2 gap-3 pt-6 sm:gap-4 sm:pt-8 lg:grid-cols-4"
          }`}
        >
          {products.map((product, index) => (
            <Reveal key={product.id} delay={Math.min(index, 3) * 90} variant="up">
              <ProductCard
                product={product}
                size={layout === "grid-2" ? "large" : "default"}
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
