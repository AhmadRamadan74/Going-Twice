import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import WishlistButton from "./WishlistButton";

export function ProductCard({
  product,
  size = "default",
}: {
  product: Product;
  size?: "default" | "large";
}) {
  const isLarge = size === "large";

  if (isLarge) {
    return (
      <article className="group">
        <div className="relative aspect-square overflow-hidden rounded-[6px] bg-[#ede0cc]">
          <Link href={`/product/${product.id}`}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </Link>
          <WishlistButton product={product} />
        </div>

        <div className="pt-3">
          <h3 className="font-display text-[18px] font-medium leading-[22.5px] text-[#3b2a24]">
            <Link href={`/product/${product.id}`} className="hover:text-wine">
              {product.name}
            </Link>
          </h3>
          <p className="pt-1 text-[12px] leading-[18px] text-[#6b5a4a]">
            {product.seller}
          </p>
          <p className="pt-1.5 text-[14px] font-medium leading-[21px] text-[#6b3d4b]">
            {product.price}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="group overflow-hidden rounded-[4px] border-[0.8px] border-line bg-white transition-shadow hover:shadow-[0_2px_12px_rgba(59,42,36,0.08)]">
      <div className="relative aspect-square bg-sand">
        <Link href={`/product/${product.id}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 264px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <WishlistButton product={product} />
      </div>

      <div className="p-2.5 sm:p-3.5">
        <h3 className="font-display text-[14px] font-medium leading-[1.25] text-ink sm:text-[15px] sm:leading-[18.75px]">
          <Link href={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="pt-1 text-[11px] leading-[16px] text-muted sm:text-[12px] sm:leading-[18px]">
          {product.seller}
        </p>
        <p className="pt-1 text-[12px] font-semibold leading-[18px] text-wine sm:pt-1.5 sm:text-[13px] sm:leading-[19.5px]">
          {product.price}
        </p>
      </div>
    </article>
  );
}

export default function ProductGrid({
  eyebrow,
  title,
  linkLabel,
  linkHref,
  products,
}: {
  eyebrow: string;
  title: string;
  linkLabel?: string;
  linkHref?: string;
  products: Product[];
}) {
  return (
    <section className="theme-section py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          linkLabel={linkLabel}
          linkHref={linkHref}
        />
        <div className="grid grid-cols-2 gap-3 pt-6 sm:gap-4 sm:pt-8 lg:grid-cols-4">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={Math.min(index, 3) * 90} variant="up">
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
