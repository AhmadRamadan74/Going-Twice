import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="eyebrow text-muted">404</p>
      <h1 className="pt-3 font-display text-[36px] font-medium text-ink sm:text-[48px]">
        Page not found
      </h1>
      <p className="max-w-[400px] pt-4 text-[14px] leading-[22px] text-muted">
        This page doesn&apos;t exist — or the piece has already found a new home.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-[2px] bg-wine px-7 py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}
