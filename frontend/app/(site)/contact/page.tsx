import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactForm from "@/components/ContactForm";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Contact — Going Twice",
  description: "Get in touch with the Going Twice team in Cairo.",
};

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <PageHero
        eyebrow="Get in Touch"
        title="Contact us"
        lead="Questions about a listing, selling, or partnerships — we would love to hear from you."
      />
      <section className="container-page py-8 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px] lg:gap-14">
          <ContactForm />
          <aside className="space-y-6 text-[14px] leading-[22px] text-muted">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink">
                Email
              </p>
              <p className="pt-1">hello@goingtwice.eg</p>
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink">
                Based in
              </p>
              <p className="pt-1">Cairo, Egypt</p>
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink">
                Hours
              </p>
              <p className="pt-1">Saturday–Thursday, 10:00–18:00</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
