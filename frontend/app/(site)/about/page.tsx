import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";
import { valueProps } from "@/lib/data";

export const metadata: Metadata = {
  title: "About — Going Twice",
  description:
    "Cairo's curated vintage marketplace. Buy and sell remarkable pieces direct from private homes across Egypt.",
};

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <PageHero
        eyebrow="Our Story"
        title="A home less ordinary"
        lead="Going Twice is Cairo's curated vintage marketplace — timeless pieces, found twice."
      />

      <section className="container-page py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ArticleBody
            paragraphs={[
              "We believe the best interiors are not bought in a single afternoon. They are assembled — slowly, carefully — from pieces that already have a life.",
              "Going Twice connects private sellers across Egypt with buyers who care about character, craftsmanship, and honest prices. No anonymous warehouses. No inflated retail markups. Just remarkable furniture, lighting, and art, reviewed before they go live.",
              "Whether you are furnishing a first apartment in Zamalek or editing a family home in Maadi, we want the next chapter of each piece to feel intentional.",
            ]}
          />
          <div className="relative min-h-[280px] overflow-hidden rounded-[4px] border-[0.8px] border-line bg-sand sm:min-h-[360px]">
            <Image
              src="/images/hero-living-room.jpg"
              alt="Vintage living room interior"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-y-[0.8px] border-line bg-white py-12 sm:py-16">
        <div className="container-page">
          <p className="eyebrow text-muted">What we stand for</p>
          <h2 className="pt-2 font-display text-[28px] font-medium text-ink sm:text-[36px]">
            Quality over quantity
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map((prop) => (
              <div key={prop.title}>
                <span className="text-[18px] text-wine">{prop.symbol}</span>
                <h3 className="pt-2 font-display text-[18px] font-medium text-ink">
                  {prop.title}
                </h3>
                <p className="pt-2 text-[13px] leading-[20px] text-muted">{prop.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-[2px] bg-wine px-7 py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Shop the collection
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-[2px] border-[0.8px] border-line px-7 py-3.5 text-[14px] font-medium text-ink transition-colors hover:bg-sand"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
