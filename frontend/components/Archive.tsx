import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/data";
import { ArrowRightIcon } from "./icons";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function Archive({ articles }: { articles: Article[] }) {
  const items = articles.slice(0, 3);
  if (!items.length) return null;

  return (
    <section className="theme-section py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading
          eyebrow="Editorial"
          title="From the Archive"
          linkLabel="View all"
          linkHref="/journal"
        />

        <div className="grid gap-4 pt-6 sm:gap-5 sm:pt-8 md:grid-cols-3">
          {items.map((article, index) => (
            <Reveal key={article.slug} delay={index * 100} variant="up">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border-[0.8px] border-line bg-white transition-shadow hover:shadow-[0_2px_12px_rgba(59,42,36,0.08)]">
                <Link href={article.href} className="relative block aspect-[4/3] bg-sand">
                  {article.image ? (
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 353px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-[10px] font-medium uppercase leading-[15px] tracking-[0.15em] text-wine">
                    {article.tag}
                  </p>
                  <h3 className="pt-2 font-display text-[18px] font-medium leading-[1.25] text-ink sm:text-[20px] sm:leading-[25px]">
                    <Link href={article.href}>{article.title}</Link>
                  </h3>
                  <p className="pt-2 text-[13px] leading-[21.125px] text-muted">
                    {article.excerpt}
                  </p>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-[12px] font-medium leading-[18px] text-ink">
                    Read the story
                    <ArrowRightIcon className="size-[11px] transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
