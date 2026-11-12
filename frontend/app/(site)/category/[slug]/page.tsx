import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import CatalogSection from "@/components/CatalogSection";
import PageHero from "@/components/PageHero";
import { loadCategory, loadProducts } from "@/lib/server-data";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: "Category — Going Twice" };
  return {
    title: `${category.name} — Going Twice`,
    description: category.description,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) notFound();

  const { sort } = await searchParams;
  const products = await loadProducts(
    category.parentId
      ? { subcategory: category.slug, sort }
      : { category: category.slug, sort },
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ]}
      />
      <PageHero
        eyebrow="Category"
        title={category.name}
        lead={category.description}
      />
      <CatalogSection products={products} />
    </>
  );
}
