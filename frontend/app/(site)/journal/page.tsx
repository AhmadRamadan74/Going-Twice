import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/icons";
import { loadArticles } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Journal — Going Twice",
  description: "Editorial stories on considered interiors, vintage finds, and styling.",
};

export default async function JournalIndexPage() {
  const items = await loadArticles();

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />
      <PageHero
        eyebrow="Editorial"
        title="From the Archive"
        lead="Stories on living with vintage — guides, styling notes, and pieces worth inheriting."
      />

      <section className="container-page py-10 sm:py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((article, index) => (
            <Reveal key={article.slug} delay={index * 100} variant="up">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border-[0.8px] border-line bg-white transition-shadow hover:shadow-[0_2px_12px_rgba(59,42,36,0.08)]">
                <Link href={article.href} className="relative block aspect-[4/3] bg-sand">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 353px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-wine">
                    {article.tag}
                  </p>
                  <h2 className="pt-2 font-display text-[18px] font-medium leading-[1.25] text-ink sm:text-[20px]">
                    <Link href={article.href}>{article.title}</Link>
                  </h2>
                  <p className="pt-2 text-[13px] leading-[21px] text-muted">{article.excerpt}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-[12px] font-medium text-ink">
                    Read the story
                    <ArrowRightIcon className="size-[11px] transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
