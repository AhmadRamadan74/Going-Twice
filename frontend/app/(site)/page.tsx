import Archive from "@/components/Archive";
import CollectorsEdit from "@/components/CollectorsEdit";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import ProductGrid from "@/components/ProductGrid";
import SellCTA from "@/components/SellCTA";
import ShopByCategory from "@/components/ShopByCategory";
import ShopByRoom from "@/components/ShopByRoom";
import ValueProps from "@/components/ValueProps";
import { loadArticles, loadCategories, loadEditorsPicks, loadJustListed, loadProducts, loadRooms } from "@/lib/server-data";

export default async function HomePage() {
  const [justListed, editorsPicks, catalog, categories, rooms, articles] = await Promise.all([
    loadJustListed(),
    loadEditorsPicks(),
    loadProducts({ sort: "newest", per_page: 12 }),
    loadCategories(),
    loadRooms(),
    loadArticles(),
  ]);

  const featured = new Set(
    [...justListed, ...editorsPicks].map((product) => product.id),
  );
  const moreToDiscover = catalog.filter((product) => !featured.has(product.id)).slice(0, 8);

  return (
    <>
      <Hero />

      <ProductGrid
        eyebrow="Just Listed"
        title="New to Going Twice"
        linkLabel="View all new arrivals"
        linkHref="/shop?sort=newest"
        products={justListed.slice(0, 4)}
      />

      <CollectorsEdit />

      <ShopByCategory categories={categories} />

      <ShopByRoom rooms={rooms} />

      <ProductGrid
        eyebrow="Handpicked"
        title="Editor's Picks"
        linkLabel="Browse all"
        linkHref="/shop?collection=editors-picks"
        products={editorsPicks.slice(0, 4)}
      />

      <ValueProps />

      <ProductGrid
        eyebrow="Recently Added"
        title="More to Discover"
        linkLabel="View all"
        linkHref="/shop"
        products={moreToDiscover}
      />

      <SellCTA />

      <Archive articles={articles} />

      <Newsletter />
    </>
  );
}
