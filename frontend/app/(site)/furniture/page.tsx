import { buildDepartmentPage, departmentMetadata } from "@/lib/department-page";

export const metadata = departmentMetadata("furniture");

type Props = {
  searchParams: Promise<{ sort?: string; category?: string; subcategory?: string }>;
};

export default async function FurniturePage({ searchParams }: Props) {
  const { sort, category, subcategory } = await searchParams;
  return await buildDepartmentPage("furniture", { sort, category, subcategory });
}
