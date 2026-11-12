import type { Metadata } from "next";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Terms of Service — Going Twice",
  description: "Terms governing use of the Going Twice marketplace.",
};

export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
      <PageHero eyebrow="Legal" title="Terms of Service" lead="Last updated July 2026." />
      <section className="container-page py-10 sm:py-14">
        <ArticleBody
          paragraphs={[
            "By using Going Twice, you agree to these terms. If you do not agree, please do not use the marketplace.",
            "Going Twice provides a platform for private sellers to list curated vintage pieces and for buyers to discover them. We are not a party to the sale contract between buyer and seller. Price, payment, and handover are agreed directly between the parties.",
            "Sellers must provide accurate descriptions, honest condition notes, and clear photographs. Listings are reviewed before publication; we may decline or remove listings that do not meet our standards.",
            "Buyers should inspect pieces (or ask questions) before confirming. Payments are made via InstaPay or bank transfer to the seller. Going Twice does not hold funds in escrow unless separately agreed in writing.",
            "You must not misuse the platform, post fraudulent listings, or harass other users. We may suspend accounts that violate these terms.",
            "To the fullest extent permitted by law, Going Twice is not liable for disputes arising from transactions between users. Contact hello@goingtwice.eg for questions about these terms.",
          ]}
        />
      </section>
    </>
  );
}
