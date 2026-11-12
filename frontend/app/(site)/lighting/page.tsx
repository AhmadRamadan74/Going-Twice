import { buildDepartmentPage, departmentMetadata } from "@/lib/department-page";

export const metadata = departmentMetadata("lighting");

type Props = {
  searchParams: Promise<{ sort?: string; category?: string; subcategory?: string }>;
};

export default async function LightingPage({ searchParams }: Props) {
  const { sort, category, subcategory } = await searchParams;
  return await buildDepartmentPage("lighting", { sort, category, subcategory });
}
