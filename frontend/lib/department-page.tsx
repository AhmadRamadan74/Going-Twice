import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogSection from "@/components/CatalogSection";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import DepartmentHero from "@/components/DepartmentHero";
import { getDepartment, type DepartmentSlug } from "@/lib/data";
import { loadDepartmentCategories, loadProducts } from "@/lib/server-data";

export async function buildDepartmentPage(
  slug: DepartmentSlug,
  options?: { sort?: string; category?: string; subcategory?: string },
) {
  const dept = getDepartment(slug)!;
  const category =
    options?.category && options.category !== "all" ? options.category : undefined;
  const subcategory = category ? options?.subcategory : undefined;
  const [products, filters] = await Promise.all([
    loadProducts({
      department: slug,
      category,
      subcategory,
      sort: options?.sort,
      per_page: 48,
    }),
    loadDepartmentCategories(slug),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {dept.heroImage && (
        <DepartmentHero
          title={dept.title}
          image={dept.heroImage}
          imageAlt={dept.title}
          pieceCount={products.length}
        />
      )}
      <div className="flex flex-1 flex-col bg-[#E3DCC9]">
        {filters.length > 0 && (
          <Suspense fallback={null}>
            <CategoryFilterBar filters={filters} />
          </Suspense>
        )}
        <CatalogSection
          products={products}
          layout="grid-2"
          showSort={false}
          emptyMessage="No pieces in this view yet. Check back soon."
        />
      </div>
    </div>
  );
}

export function departmentMetadata(slug: DepartmentSlug): Metadata {
  const dept = getDepartment(slug)!;
  return {
    title: `${dept.name} — Going Twice`,
    description: dept.lead,
  };
}

