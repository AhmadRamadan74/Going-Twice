import Image from "next/image";
import Link from "next/link";
import type { Taxonomy } from "@/lib/server-data";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function ShopByCategory({ categories }: { categories: Taxonomy[] }) {
  if (!categories.length) return null;

  return (
    <section className="theme-section bg-sage-mist/40 py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading eyebrow="Browse" title="Shop by Category" />

        <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-3 sm:gap-3 sm:pt-8 md:grid-cols-6">
          {categories.map((category, index) => (
            <Reveal key={category.slug} delay={Math.min(index, 5) * 70} variant="up">
              <Link href={`/category/${category.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-[4px] border-[0.8px] border-line bg-sand">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 174px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="pt-2 text-center text-[12px] font-medium leading-[18px] text-ink sm:pt-2.5 sm:text-[13px] sm:leading-[19.5px]">
                  {category.name}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
