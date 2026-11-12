import Image from "next/image";
import Link from "next/link";
import BrandLogo from "./BrandLogo";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden bg-ink-deep lg:block">
        <Image
          src="/images/hero-living-room.jpg"
          alt="Vintage Cairo interior"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[rgba(26,18,8,0.62)]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandLogo href="/" variant="horizontal" tone="light" />
          <div className="max-w-[420px]">
            <p className="font-display text-[36px] font-medium leading-[1.15] tracking-[-0.02em] text-cream lg:text-[42px]">
              &ldquo;Every piece has lived a life before yours.&rdquo;
            </p>
            <p className="pt-4 text-[14px] leading-[22px] text-cream/70">
              Egypt&apos;s curated marketplace for vintage furniture, lighting, art, and
              décor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Vintage", "Curated", "Cairo", "Rare Finds"].map((tag) => (
              <span
                key={tag}
                className="rounded-[2px] border border-cream/25 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cream/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col bg-white px-6 py-8 sm:px-10 lg:px-16">
        <div className="mb-10 lg:hidden">
          <BrandLogo href="/" variant="horizontal" />
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          {children}
        </div>
        <p className="pt-10 text-center text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Back to Going Twice
          </Link>
        </p>
      </section>
    </div>
  );
}
