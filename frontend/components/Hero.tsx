import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-deep">
      <Image
        src="/images/hero-living-room.jpg"
        alt="Elegant vintage living room with warm lighting and antique furniture"
        fill
        priority
        sizes="100vw"
        className="hero-image-animate object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(26,18,8,0.75)] via-[rgba(26,18,8,0.45)] to-[rgba(26,18,8,0.7)] sm:bg-gradient-to-r sm:from-[rgba(26,18,8,0.8)] sm:via-[rgba(26,18,8,0.4)] sm:to-transparent" />

      <div className="relative flex min-h-[min(72vh,560px)] items-center py-14 sm:min-h-[438px] sm:py-16 md:min-h-[520px]">
        <div className="container-page">
          <p className="hero-animate eyebrow text-sage">
            Cairo&apos;s Curated Vintage Marketplace
          </p>

          <h1 className="hero-animate hero-animate-delay-1 pt-4 font-display text-[42px] font-medium leading-[0.96] tracking-[-0.02em] text-cream sm:pt-5 sm:text-[64px] lg:text-[76px]">
            A Home
            <br />
            <em className="italic">Less Ordinary.</em>
          </h1>

          <p className="hero-animate hero-animate-delay-2 max-w-[420px] pt-5 text-[14px] leading-[22px] text-cream/70 sm:pt-6 sm:text-[15px] sm:leading-[24.375px]">
            Buy and sell remarkable vintage furniture, lighting, and art — direct from
            private homes across Egypt.
          </p>

          <div className="hero-animate hero-animate-delay-3 flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap sm:pt-8">
            <Link
              href="/shop"
              className="theme-cta rounded-[2px] bg-wine px-7 py-3.5 text-center text-[15px] font-medium leading-[22.5px] text-white transition-opacity hover:opacity-90"
            >
              Shop the Collection
            </Link>
            <Link
              href="/sell"
              className="theme-cta rounded-[2px] border-[0.8px] border-cream/50 px-7 py-3.5 text-center text-[15px] font-medium leading-[22.5px] text-cream transition-colors hover:bg-cream/10"
            >
              Sell a Piece
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
