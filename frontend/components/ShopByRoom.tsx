import Image from "next/image";
import Link from "next/link";
import type { Taxonomy } from "@/lib/server-data";
import { ArrowRightIcon } from "./icons";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function ShopByRoom({ rooms }: { rooms: Taxonomy[] }) {
  if (!rooms.length) return null;

  return (
    <section className="theme-room py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading eyebrow="Collections" title="Shop by Room" />

        <div className="grid gap-3 pt-6 sm:gap-4 sm:pt-8 md:grid-cols-3">
          {rooms.map((room, index) => (
            <Reveal key={room.slug} delay={index * 100} variant="up">
              <Link
                href={`/room/${room.slug}`}
                className="group relative isolate flex h-[280px] items-end overflow-hidden rounded-[6px] border-[0.8px] border-line bg-sand sm:h-[360px] md:h-[446px]"
              >
                {room.image ? (
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 357px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(59,42,36,0.65)] via-transparent to-transparent" />

                <div className="relative w-full p-4 text-center sm:p-5">
                  <p className="font-display text-[22px] font-medium leading-[1.3] tracking-[-0.01em] text-cream sm:text-[26px] sm:leading-[39px]">
                    {room.name}
                  </p>
                  <span className="flex items-center justify-center gap-1 pt-1 text-[12px] font-medium leading-[18px] text-cream/70">
                    Browse pieces
                    <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
