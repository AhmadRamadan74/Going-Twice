import { Suspense } from "react";
import CatalogView from "@/components/CatalogView";
import type { Product } from "@/lib/data";

export default function CatalogSection({
  products,
  emptyMessage,
  layout = "grid-4",
  showSort = true,
}: {
  products: Product[];
  emptyMessage?: string;
  layout?: "grid-4" | "grid-2";
  showSort?: boolean;
}) {
  return (
    <section
      className={`container-page flex-1 ${layout === "grid-2" ? "pb-16 pt-0" : "py-8 sm:py-10 lg:py-12"}`}
    >
      <Suspense
        fallback={
          <p className="py-8 text-[13px] text-muted">Loading collection…</p>
        }
      >
        <CatalogView
          products={products}
          emptyMessage={emptyMessage}
          layout={layout}
          showSort={showSort}
        />
      </Suspense>
    </section>
  );
}
