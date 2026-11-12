import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";

export default function SellCTA() {
  return (
    <section className="bg-sage-mist/35 py-2 sm:py-4">
      <div className="container-page">
        <Reveal variant="up">
          <div className="grid overflow-hidden rounded-[6px] border-[0.8px] border-line md:grid-cols-2">
            {/* Copy */}
            <div className="flex flex-col justify-center bg-ink p-6 sm:p-10 md:p-14">
              <p className="eyebrow pb-3 text-sage sm:pb-4">Start Selling</p>

              <h2 className="font-display text-[28px] font-medium leading-[1.12] tracking-[-0.01em] text-cream sm:text-[36px] md:text-[46px]">
                Turn Your Pieces
                <br />
                Into Someone&apos;s
                <br />
                <em className="italic">Treasure.</em>
              </h2>

              <p className="max-w-[320px] pb-6 pt-4 text-[13px] leading-[20px] text-cream/60 sm:pb-8 sm:pt-5 sm:text-[14px] sm:leading-[21px]">
                List in minutes. Set your price. We connect you with buyers who appreciate
                what you have.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/sell"
                  className="theme-cta rounded-[2px] bg-wine px-7 py-3.5 text-center text-[14px] font-medium leading-[21px] text-white transition-opacity hover:opacity-90"
                >
                  List a Piece
                </Link>
                <Link
                  href="/how-it-works"
                  className="theme-cta rounded-[2px] border-[0.8px] border-cream/30 px-7 py-3.5 text-center text-[14px] font-medium leading-[21px] text-cream transition-colors hover:bg-cream/10"
                >
                  How It Works
                </Link>
              </div>
            </div>

            {/* Image */}
            <div className="relative isolate min-h-[240px] bg-linen sm:min-h-[320px] md:min-h-[380px]">
              <Image
                src="/images/sellers-interior.jpg"
                alt="Elegant vintage interior for sellers"
                fill
                sizes="(max-width: 768px) 100vw, 550px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-ink/10" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
