import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import { articles } from "@/lib/data";
import { loadArticle, loadArticles } from "@/lib/server-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return { title: "Journal — Going Twice" };
  return {
    title: `${article.title} — Going Twice`,
    description: article.excerpt,
  };
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();

  const all = await loadArticles();
  const others = all.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Journal", href: "/journal" },
          { label: article.title },
        ]}
      />

      <article>
        <header className="container-page py-8 sm:py-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-wine">
            {article.tag} · {article.date}
          </p>
          <h1 className="max-w-[720px] pt-3 font-display text-[34px] font-medium leading-[1.15] tracking-[-0.02em] text-ink sm:text-[48px]">
            {article.title}
          </h1>
          <p className="max-w-[560px] pt-4 text-[15px] leading-[24px] text-muted">
            {article.excerpt}
          </p>
        </header>

        <div className="container-page">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[4px] border-[0.8px] border-line bg-sand sm:aspect-[21/9]">
            <Image
              src={article.image}
              alt={article.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="container-page py-10 sm:py-14">
          <ArticleBody paragraphs={article.body} />
        </div>
      </article>

      {others.length > 0 && (
        <section className="border-t-[0.8px] border-line bg-white py-10 sm:py-14">
          <div className="container-page">
            <p className="eyebrow text-muted">Keep reading</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {others.map((a) => (
                <Link
                  key={a.slug}
                  href={a.href}
                  className="rounded-[4px] border-[0.8px] border-line p-5 transition-colors hover:bg-sand/40"
                >
                  <p className="text-[10px] uppercase tracking-[0.15em] text-wine">{a.tag}</p>
                  <h2 className="pt-2 font-display text-[20px] font-medium text-ink">
                    {a.title}
                  </h2>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
