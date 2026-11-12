import type { Metadata } from "next";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Cookie Policy — Going Twice",
  description: "How Going Twice uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cookie Policy" }]} />
      <PageHero eyebrow="Legal" title="Cookie Policy" lead="Last updated July 2026." />
      <section className="container-page py-10 sm:py-14">
        <ArticleBody
          paragraphs={[
            "Cookies are small text files stored on your device. Going Twice uses them to keep the site working, remember preferences, and understand how the marketplace is used.",
            "Essential cookies enable core functions such as page navigation and security. Analytics cookies (if enabled) help us see which pages are visited so we can improve the experience. We do not use cookies to sell your data to advertisers.",
            "You can control cookies through your browser settings. Blocking essential cookies may affect how the site functions.",
            "For privacy questions, see our Privacy Policy or email hello@goingtwice.eg.",
          ]}
        />
      </section>
    </>
  );
}
