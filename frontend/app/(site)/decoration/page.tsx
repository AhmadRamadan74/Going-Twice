import { buildDepartmentPage, departmentMetadata } from "@/lib/department-page";

export const metadata = departmentMetadata("decoration");

type Props = {
  searchParams: Promise<{ sort?: string; category?: string; subcategory?: string }>;
};

export default async function DecorationPage({ searchParams }: Props) {
  const { sort, category, subcategory } = await searchParams;
  return await buildDepartmentPage("decoration", { sort, category, subcategory });
}
