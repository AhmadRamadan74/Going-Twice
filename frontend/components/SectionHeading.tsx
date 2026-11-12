import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  linkLabel,
  linkHref,
}: {
  eyebrow: string;
  title: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="eyebrow font-normal tracking-[0.15em] text-muted">{eyebrow}</p>
          <h2 className="pt-1.5 font-display text-[28px] font-medium leading-[1.2] tracking-[-0.01em] text-ink sm:pt-2 sm:text-[36px] sm:leading-[54px]">
            {title}
          </h2>
        </div>

        {linkLabel && linkHref && (
          <Link
            href={linkHref}
            className="group flex items-center gap-1.5 pb-0.5 text-[13px] font-medium leading-[20px] text-ink transition-opacity hover:opacity-70 sm:pb-1"
          >
            {linkLabel}
            <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </Reveal>
  );
}
