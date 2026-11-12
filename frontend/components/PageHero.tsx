import Image from "next/image";
import Reveal from "./Reveal";

export default function PageHero({
  eyebrow,
  title,
  lead,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  image?: string;
  imageAlt?: string;
}) {
  return (
    <section className="border-b-[0.8px] border-line bg-sage-mist/50">
      <div
        className={`container-page py-10 sm:py-14 lg:py-16 ${
          image ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-12" : ""
        }`}
      >
        <Reveal>
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 className="pt-2 font-display text-[36px] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[48px] lg:text-[56px]">
            {title}
          </h1>
          {lead && (
            <p className="max-w-[540px] pt-4 text-[14px] leading-[22px] text-muted sm:pt-5 sm:text-[15px] sm:leading-[24px]">
              {lead}
            </p>
          )}
        </Reveal>

        {image && (
          <Reveal delay={80}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] border-[0.8px] border-line bg-sand lg:aspect-square">
              <Image
                src={image}
                alt={imageAlt || title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
