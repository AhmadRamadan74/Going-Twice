import Image from "next/image";
import Link from "next/link";

type LogoVariant = "horizontal" | "primary" | "monogram";
type LogoTone = "dark" | "light";

const sources: Record<LogoVariant, Record<LogoTone, string>> = {
  horizontal: {
    dark: "/logo/logo-horizontal.png",
    light: "/logo/logo-horizontal-white.png",
  },
  primary: {
    dark: "/logo/logo-primary.png",
    light: "/logo/logo-primary-white.png",
  },
  monogram: {
    dark: "/logo/logo-monogram.png",
    light: "/logo/logo-monogram-white.png",
  },
};

const sizes: Record<LogoVariant, { width: number; height: number; className: string }> = {
  horizontal: {
    width: 280,
    height: 60,
    className: "h-8 w-auto sm:h-9",
  },
  primary: {
    width: 200,
    height: 220,
    className: "h-16 w-auto sm:h-[72px]",
  },
  monogram: {
    width: 64,
    height: 50,
    className: "h-8 w-auto sm:h-9",
  },
};

export default function BrandLogo({
  href = "/",
  variant = "horizontal",
  tone = "dark",
  className = "",
}: {
  href?: string;
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
}) {
  const size = sizes[variant];

  return (
    <Link
      href={href}
      className={`inline-flex min-w-0 shrink-0 items-center ${className}`}
      aria-label="Going Twice home"
    >
      <Image
        src={sources[variant][tone]}
        alt="Going Twice"
        width={size.width}
        height={size.height}
        className={`${size.className} object-contain object-left`}
        priority
      />
    </Link>
  );
}
