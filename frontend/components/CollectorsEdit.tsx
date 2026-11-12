import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import Reveal from "./Reveal";

export default function CollectorsEdit() {
  return (
    <section className="bg-transparent py-2 sm:py-4">
      <div className="container-page">
        <Reveal variant="scale">
          <div className="relative isolate min-h-[280px] overflow-hidden rounded-[6px] border-[0.8px] border-line sm:min-h-[340px]">
            <Image
              src="/images/collectors-edit.jpg"
              alt="The Collector's Edit — ornate vintage sofa"
              fill
              sizes="(max-width: 1320px) 100vw, 1272px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(59,42,36,0.9)] via-[rgba(59,42,36,0.55)] to-[rgba(59,42,36,0.2)] md:bg-gradient-to-r md:from-[rgba(59,42,36,0.85)] md:via-[rgba(59,42,36,0.5)] md:to-transparent" />

            <div className="relative flex min-h-[320px] flex-col justify-end px-5 py-10 sm:min-h-[403px] sm:justify-center sm:px-8 sm:py-14 md:px-16">
              <p className="eyebrow pb-3 text-sage sm:pb-4">Curated Selection</p>

              <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.01em] text-cream sm:text-[42px] md:text-[58px]">
                The Collector&apos;s
                <br />
                <em className="italic">Edit</em>
              </h2>

              <p className="max-w-[340px] pb-6 pt-3 text-[13px] leading-[20px] text-cream/70 sm:pb-7 sm:pt-4 sm:text-[14px] sm:leading-[21px]">
                Rare, considered pieces handpicked for their character, provenance, and
                singular beauty.
              </p>

              <div>
                <Link
                  href="/collectors-edit"
                  className="theme-cta group inline-flex items-center gap-2 rounded-[2px] bg-wine px-6 py-3 text-[14px] font-medium leading-[21px] text-white transition-opacity hover:opacity-90 sm:px-7 sm:py-3.5 sm:text-[15px] sm:leading-[22.5px]"
                >
                  Explore the Edit
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
