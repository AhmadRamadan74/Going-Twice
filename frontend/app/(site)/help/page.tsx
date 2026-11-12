import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";
import { loadFaqs } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Help Centre — Going Twice",
  description: "Answers about buying, selling, payments, and handover on Going Twice.",
};

export default async function HelpPage() {
  const faqs = await loadFaqs();

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Help Centre" }]} />
      <PageHero
        eyebrow="Support"
        title="Help Centre"
        lead="Quick answers for buyers and sellers. Still stuck? Reach out via Contact."
      />
      <section className="container-page py-8 sm:py-12">
        <div className="mx-auto max-w-[720px] space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-[4px] border-[0.8px] border-line bg-white open:shadow-[0_2px_12px_rgba(59,42,36,0.06)]"
            >
              <summary className="cursor-pointer list-none px-5 py-4 font-display text-[18px] font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-[18px] text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="border-t-[0.8px] border-line px-5 py-4 text-[14px] leading-[22px] text-muted">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
        <p className="mx-auto max-w-[720px] pt-8 text-center text-[14px] text-muted">
          Need more help?{" "}
          <Link href="/contact" className="font-medium text-ink underline-offset-2 hover:underline">
            Contact us
          </Link>
        </p>
      </section>
    </>
  );
}
