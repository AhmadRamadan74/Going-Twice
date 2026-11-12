import type { Metadata } from "next";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";
import CatalogSection from "@/components/CatalogSection";
import { loadProducts } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "The Collector's Edit — Going Twice",
  description:
    "Rare, considered pieces handpicked for their character, provenance, and singular beauty.",
};

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function CollectorsEditPage({ searchParams }: Props) {
  const { sort } = await searchParams;
  const products = await loadProducts({
    collection: "collectors-edit",
    sort: sort || "newest",
  });

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "The Collector's Edit" },
        ]}
      />

      <section className="relative isolate overflow-hidden bg-ink-deep">
        <Image
          src="/images/collectors-edit.jpg"
          alt="The Collector's Edit"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(26,18,8,0.85)] via-[rgba(26,18,8,0.55)] to-transparent" />
        <div className="relative container-page py-16 sm:py-20 lg:py-24">
          <p className="eyebrow text-sage">Curated Selection</p>
          <h1 className="pt-3 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-cream sm:text-[56px]">
            The Collector&apos;s <em className="italic">Edit</em>
          </h1>
          <p className="max-w-[420px] pt-4 text-[14px] leading-[22px] text-cream/70 sm:text-[15px]">
            Rare, considered pieces handpicked for their character, provenance, and
            singular beauty.
          </p>
        </div>
      </section>

      <CatalogSection products={products} />
    </>
  );
}
