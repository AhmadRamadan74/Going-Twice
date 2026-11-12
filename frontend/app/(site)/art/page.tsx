import { buildDepartmentPage, departmentMetadata } from "@/lib/department-page";

export const metadata = departmentMetadata("art");

type Props = {
  searchParams: Promise<{ sort?: string; category?: string; subcategory?: string }>;
};

export default async function ArtPage({ searchParams }: Props) {
  const { sort, category, subcategory } = await searchParams;
  return await buildDepartmentPage("art", { sort, category, subcategory });
}
