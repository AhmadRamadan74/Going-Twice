import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CatalogSection from "@/components/CatalogSection";
import PageHero from "@/components/PageHero";
import { loadProducts } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Shop All — Going Twice",
  description: "Browse curated vintage furniture, lighting, art, and decoration.",
};

type Props = {
  searchParams: Promise<{ sort?: string; collection?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const products = await loadProducts({
    sort: params.sort,
    collection: params.collection,
    q: params.q,
    per_page: 48,
  });

  const collectionLabel =
    params.collection === "editors-picks"
      ? "Editor's Picks"
      : params.collection === "collectors-edit"
        ? "The Collector's Edit"
        : params.collection === "just-listed"
          ? "Just Listed"
          : params.q
            ? `Results for “${params.q}”`
            : null;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: collectionLabel || "Shop All" },
        ]}
      />
      <PageHero
        eyebrow="Marketplace"
        title={collectionLabel || "Shop All"}
        lead={
          params.q
            ? `Pieces matching “${params.q}” from Cairo's curated vintage marketplace.`
            : collectionLabel
              ? `A focused look at ${collectionLabel.toLowerCase()} from Cairo's curated vintage marketplace.`
              : "Remarkable vintage furniture, lighting, and art — direct from private homes across Egypt."
        }
      />
      <CatalogSection
        products={products}
        emptyMessage={
          params.q ? "No pieces match that search. Try another word or browse Shop All." : undefined
        }
      />
    </>
  );
}
