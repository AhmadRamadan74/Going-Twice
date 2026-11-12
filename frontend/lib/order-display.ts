import { departments, getCategoryBySlug, getDepartment, type CategorySlug } from "@/lib/data";

export function formatOrderDate(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function initials(name?: string | null) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "GT";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function paymentMethodLabel(method?: string | null) {
  const key = (method || "").toLowerCase().replace(/\s+/g, "_");
  const labels: Record<string, string> = {
    instapay: "InstaPay",
    bank_transfer: "Bank Transfer",
    bank: "Bank Transfer",
    vodafone_cash: "Vodafone Cash",
    vodafone: "Vodafone Cash",
    etisalat_cash: "Etisalat Cash",
    etisalat: "Etisalat Cash",
  };
  return labels[key] || method || "—";
}

export function prettySlug(slug?: string | null) {
  if (!slug) return "";
  const category = getCategoryBySlug(slug as CategorySlug);
  if (category) return category.name;
  const department = getDepartment(slug);
  if (department) return department.name;
  for (const item of departments) {
    const filter = item.shopFilters?.find((row) => row.slug === slug);
    if (filter) return filter.label;
  }
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function catalogPath(department?: string | null, category?: string | null) {
  const dept = prettySlug(department);
  const cat = prettySlug(category);
  if (dept && cat && dept !== cat) return `${dept} · ${cat}`;
  return cat || dept || "";
}
