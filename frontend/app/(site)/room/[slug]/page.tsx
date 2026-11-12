import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import CatalogSection from "@/components/CatalogSection";
import PageHero from "@/components/PageHero";
import { loadProducts, loadRoom } from "@/lib/server-data";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await loadRoom(slug);
  if (!room) return { title: "Shop by Room — Going Twice" };
  return {
    title: `${room.name} — Going Twice`,
    description: room.description,
  };
}

export default async function RoomPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const room = await loadRoom(slug);
  if (!room) notFound();

  const { sort } = await searchParams;
  const products = await loadProducts({
    room: room.slug,
    sort,
  });

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: room.name },
        ]}
      />
      <PageHero eyebrow="Shop by Room" title={room.name} lead={room.description} />
      <CatalogSection products={products} />
    </>
  );
}
