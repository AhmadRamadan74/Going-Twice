"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CategoryFilter = {
  slug: string;
  label: string;
  subcategories?: { slug: string; label: string }[];
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border-[0.8px] px-[17px] py-[9px] text-[13px] font-medium leading-[19.5px] transition-colors ${
        active
          ? "border-[#6b3d4b] bg-[#6b3d4b] text-white"
          : "border-[rgba(107,90,74,0.3)] bg-transparent text-[#6b5a4a] hover:border-[rgba(107,90,74,0.5)]"
      }`}
    >
      {label}
    </button>
  );
}

export default function CategoryFilterBar({ filters }: { filters: CategoryFilter[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const activeSubcategory = searchParams.get("subcategory") || "";

  function goTo(next: { category?: string; subcategory?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next.category || next.category === "all") {
      params.delete("category");
    } else {
      params.set("category", next.category);
    }
    if (!next.subcategory) {
      params.delete("subcategory");
    } else {
      params.set("subcategory", next.subcategory);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeFilter = filters.find((filter) => filter.slug === activeCategory);
  const subcategories = activeFilter?.subcategories ?? [];

  return (
    <section className="border-b-[0.8px] border-[rgba(107,90,74,0.2)]">
      <div className="container-page space-y-3 py-6">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Chip
            label="All"
            active={activeCategory === "all"}
            onClick={() => goTo({ category: "all" })}
          />
          {filters.map((filter) => (
            <Chip
              key={filter.slug}
              label={filter.label}
              active={activeCategory === filter.slug}
              onClick={() => goTo({ category: filter.slug })}
            />
          ))}
        </div>
        {subcategories.length > 0 && (
          <div className="flex flex-wrap items-center justify-start gap-2 pl-1">
            <Chip
              label="All"
              active={!activeSubcategory}
              onClick={() => goTo({ category: activeCategory })}
            />
            {subcategories.map((sub) => (
              <Chip
                key={sub.slug}
                label={sub.label}
                active={activeSubcategory === sub.slug}
                onClick={() => goTo({ category: activeCategory, subcategory: sub.slug })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
