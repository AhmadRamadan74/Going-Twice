import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductActions from "@/components/ProductActions";
import ProductGallery from "@/components/ProductGallery";
import ProductGrid from "@/components/ProductGrid";
import { loadProduct } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadProduct(id);
  if (!data) return { title: "Product — Going Twice" };
  return {
    title: `${data.product.name} — Going Twice`,
    description: data.product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const data = await loadProduct(id);
  if (!data) notFound();

  const { product, related } = data;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: product.department, href: `/${product.department}` },
          { label: product.name },
        ]}
      />

      <section className="container-page py-8 sm:py-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images ?? [product.image]} alt={product.name} />

          <div className="flex flex-col justify-center">
            <p className="eyebrow text-muted">{product.era}</p>
            <h1 className="pt-2 font-display text-[32px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[42px]">
              {product.name}
            </h1>
            <p className="pt-2 text-[14px] text-muted">
              Listed by <span className="text-ink">{product.seller}</span>
            </p>
            <p className="pt-4 text-[22px] font-semibold text-wine sm:text-[24px]">
              {product.price}
            </p>
            <span className="mt-3 inline-flex w-fit rounded-full bg-sage-mist px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-olive">
              Vintage
            </span>

            <p className="pt-6 text-[14px] leading-[22px] text-ink/85 sm:text-[15px] sm:leading-[24px]">
              {product.description}
            </p>

            <dl className="mt-8 grid gap-4 border-t-[0.8px] border-line pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Condition
                </dt>
                <dd className="pt-1 text-[14px] text-ink">{product.condition}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Dimensions
                </dt>
                <dd className="pt-1 text-[14px] text-ink">{product.dimensions}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Category
                </dt>
                <dd className="pt-1 text-[14px] text-ink capitalize">{product.category}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Room
                </dt>
                <dd className="pt-1 text-[14px] text-ink capitalize">
                  {product.room.replace("-", " ")}
                </dd>
              </div>
            </dl>

            <ProductActions product={product} />

            <p className="pt-4 text-[12px] leading-[18px] text-muted">
              Pay via InstaPay, Vodafone Cash, Etisalat Cash, or bank transfer
              directly to the seller. Going Twice does not process payments.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <ProductGrid
          eyebrow="You may also like"
          title="Similar Pieces"
          linkLabel="View all"
          linkHref="/shop"
          products={related}
        />
      )}
    </>
  );
}
