import type { Metadata } from "next";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy — Going Twice",
  description: "How Going Twice collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <PageHero eyebrow="Legal" title="Privacy Policy" lead="Last updated July 2026." />
      <section className="container-page py-10 sm:py-14">
        <ArticleBody
          paragraphs={[
            "Going Twice (“we”, “us”) operates a curated marketplace for vintage furniture, lighting, and art in Egypt. This policy explains what information we collect and how we use it.",
            "When you create an account, list a piece, enquire about a listing, subscribe to our newsletter, or contact us, we may collect your name, email, phone number, city, and the content of your messages or listings.",
            "We use this information to operate the marketplace, review listings, connect buyers and sellers, improve the product, and send newsletters when you opt in. We do not sell your personal data.",
            "Payments between buyers and sellers happen off-platform via InstaPay or bank transfer. We do not store card numbers or process payments on your behalf.",
            "We retain information as long as needed to provide the service and meet legal obligations. You may request access, correction, or deletion by contacting hello@goingtwice.eg.",
            "This policy may be updated from time to time. Continued use of Going Twice after changes means you accept the revised policy.",
          ]}
        />
      </section>
    </>
  );
}
