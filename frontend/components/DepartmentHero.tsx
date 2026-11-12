import Image from "next/image";

export default function DepartmentHero({
  title,
  image,
  imageAlt,
  pieceCount,
}: {
  title: string;
  image: string;
  imageAlt?: string;
  pieceCount: number;
}) {
  return (
    <section className="relative h-[280px] w-full overflow-hidden bg-[#ede0cc]">
      <Image
        src={image}
        alt={imageAlt || title}
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority
      />
      <div className="absolute inset-0 bg-[rgba(59,42,36,0.4)]" />
      <div className="container-page relative flex h-full flex-col justify-end pb-10">
        <h1 className="font-display text-[48px] font-medium leading-none tracking-[-0.02em] text-[#f2e8d6] sm:text-[56px] lg:text-[64px]">
          {title}
        </h1>
        <p className="pt-2 text-[14px] leading-[21px] text-[rgba(242,232,214,0.7)]">
          {pieceCount} curated {pieceCount === 1 ? "piece" : "pieces"}
        </p>
      </div>
    </section>
  );
}
