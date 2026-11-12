import Link from "next/link";
import { footerColumns } from "@/lib/data";
import BrandLogo from "./BrandLogo";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "./icons";
import Reveal from "./Reveal";

const socials = [
  { label: "Facebook", Icon: FacebookIcon, href: "#" },
  { label: "Instagram", Icon: InstagramIcon, href: "#" },
  { label: "Twitter", Icon: TwitterIcon, href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-ink px-4 py-14 sm:px-6 sm:py-20">
      <Reveal variant="fade">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-[1fr_auto_auto_auto] lg:gap-20">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <BrandLogo href="/" variant="primary" tone="light" />

              <p className="max-w-[260px] pt-4 text-[14px] leading-[22.75px] text-cream/60">
                Crafting Timeless Living Spaces.
              </p>

              <div className="flex items-center gap-4 pt-6">
                {socials.map(({ label, Icon, href }) => (
                  <Link
                    key={label}
                    href={href}
                    aria-label={label}
                    className="text-cream/40 transition-colors hover:text-cream"
                  >
                    <Icon className="size-4" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {footerColumns.map((column) => (
              <div key={column.title} className="lg:w-[182px]">
                <p className="eyebrow font-medium tracking-[0.1em] text-cream/40">
                  {column.title}
                </p>
                <ul className="flex flex-col gap-3 pt-5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[14px] font-medium leading-[21px] text-cream/70 transition-colors hover:text-cream"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t-[0.8px] border-cream/10 pt-6 sm:mt-16 sm:flex-row sm:items-center sm:pt-8">
            <p className="text-[12px] leading-[18px] text-cream/40">
              © Going Twice 2026. All rights reserved. — Powered by{" "}
              <Link href="https://teleoceans.com" className="hover:text-cream/70">
                Teleoceans.com
              </Link>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {["InstaPay", "Vodafone Cash", "Etisalat Cash", "Bank Transfer"].map(
                (method) => (
                  <span
                    key={method}
                    className="rounded-[2px] border-[0.8px] border-cream/15 px-2.5 py-1 text-[11px] leading-[16.5px] text-cream/40"
                  >
                    {method}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
