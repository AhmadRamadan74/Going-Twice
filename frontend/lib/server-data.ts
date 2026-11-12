import {
  ApiError,
  categoriesService,
  faqService,
  journalService,
  productsService,
  roomsService,
  type ProductListParams,
} from "@/lib/api";
import {
  categories as staticCategories,
  departments as staticDepartments,
  editorsPicks as staticEditors,
  filterCatalog,
  getArticleBySlug,
  getCategoryBySlug,
  getProductById,
  getRelatedProducts,
  getRoomBySlug,
  helpFaqs,
  justListed as staticJustListed,
  rooms as staticRooms,
  articles,
  type Article,
  type Product,
} from "@/lib/data";
import { mapArticle, mapFaq, mapProduct } from "@/lib/mappers";
import { mediaUrl } from "@/lib/media";

/**
 * Static sample data is a development aid, not a safety net. With the flag
 * off (the default, including production) a backend failure surfaces as a
 * real error instead of quietly serving pieces nobody can actually buy —
 * mock products carry no backend id, so they cannot be added to a cart.
 */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function report(scope: string, error: unknown) {
  console.error(`[server-data] ${scope} failed:`, error);
}

/** True only for a real "no such record", not for an unreachable backend. */
function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Runs `load`. On failure it either falls back to sample data (when mocks are
 * explicitly enabled) or rethrows so the failure is visible.
 */
async function withFallback<T>(
  scope: string,
  load: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    report(scope, error);
    if (USE_MOCK_DATA) return fallback();
    throw error;
  }
}

export async function loadProducts(params: ProductListParams = {}): Promise<Product[]> {
  return withFallback(
    "loadProducts",
    async () => {
      const page = await productsService.list(params);
      return page.items.map(mapProduct);
    },
    () =>
      filterCatalog({
        department: params.department as Product["department"],
        category: params.category as Product["category"],
        room: params.room as Product["room"],
        collection: params.collection,
        sort: params.sort,
        q: params.q,
      }),
  );
}

export async function loadJustListed(): Promise<Product[]> {
  return withFallback(
    "loadJustListed",
    async () => (await productsService.justListed()).map(mapProduct),
    () => staticJustListed,
  );
}

export async function loadEditorsPicks(): Promise<Product[]> {
  return withFallback(
    "loadEditorsPicks",
    async () => (await productsService.editorsPicks()).map(mapProduct),
    () => staticEditors,
  );
}

export async function loadProduct(id: string): Promise<{
  product: Product;
  related: Product[];
} | null> {
  try {
    const data = await productsService.getBySlug(id);
    return {
      product: mapProduct(data.product),
      related: data.related.map(mapProduct),
    };
  } catch (error) {
    report("loadProduct", error);
    if (!USE_MOCK_DATA) {
      // A genuine 404 renders notFound; anything else is an outage and must
      // not be disguised as "this piece doesn't exist".
      if (isNotFound(error)) return null;
      throw error;
    }
    const product = getProductById(id);
    if (!product) return null;
    return { product, related: getRelatedProducts(product) };
  }
}

export async function loadArticles(): Promise<Article[]> {
  return withFallback(
    "loadArticles",
    async () => (await journalService.list()).map(mapArticle),
    () => articles,
  );
}

export async function loadArticle(slug: string): Promise<Article | null> {
  try {
    return mapArticle(await journalService.getBySlug(slug));
  } catch (error) {
    report("loadArticle", error);
    if (!USE_MOCK_DATA) {
      if (isNotFound(error)) return null;
      throw error;
    }
    return getArticleBySlug(slug) ?? null;
  }
}

export async function loadFaqs() {
  return withFallback(
    "loadFaqs",
    async () => (await faqService.list()).map(mapFaq),
    () => helpFaqs,
  );
}

// ── Taxonomy ──────────────────────────────────────────────────────────
// Categories and rooms come from the API so the shop reflects what the
// backend actually publishes.
//
// Looking up a *single* category or room keeps its static fallback even with
// mocks off: these are presentation labels, never purchasable inventory, and
// the product list rendered beside them still fails loudly on an outage.
// Anything that yields buyable pieces stays behind the flag.

export type Taxonomy = {
  name: string;
  slug: string;
  description: string;
  image?: string;
  parentId?: number | null;
};

function toTaxonomy(row: {
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  parent_id?: number | null;
}): Taxonomy {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    image: mediaUrl(row.image_url || row.image || undefined) || undefined,
    parentId: row.parent_id ?? null,
  };
}

export async function loadCategories(): Promise<Taxonomy[]> {
  return withFallback(
    "loadCategories",
    async () => (await categoriesService.list()).map(toTaxonomy),
    () => staticCategories.map(toTaxonomy),
  );
}

export async function loadCategory(slug: string): Promise<Taxonomy | null> {
  try {
    return toTaxonomy(await categoriesService.getBySlug(slug));
  } catch (error) {
    report("loadCategory", error);
    const fallback = getCategoryBySlug(slug);
    return fallback ? toTaxonomy(fallback) : null;
  }
}

export async function loadRooms(): Promise<Taxonomy[]> {
  return withFallback(
    "loadRooms",
    async () => (await roomsService.list()).map(toTaxonomy),
    () => staticRooms.map(toTaxonomy),
  );
}

export type DepartmentCategory = {
  slug: string;
  label: string;
  subcategories: { slug: string; label: string }[];
};

/**
 * Live category tree for one department's filter bar — replaces the old
 * hardcoded shopFilters so anything the admin adds/edits/removes shows up
 * here without a code change. Falls back to the static shopFilters only
 * when mocks are explicitly enabled.
 */
export async function loadDepartmentCategories(
  department: string,
): Promise<DepartmentCategory[]> {
  return withFallback(
    "loadDepartmentCategories",
    async () => {
      const rows = await categoriesService.list({ department });
      const parents = rows.filter((row) => !row.parent_id);
      return parents.map((parent) => ({
        slug: parent.slug,
        label: parent.name,
        subcategories: rows
          .filter((row) => row.parent_id === parent.id)
          .map((row) => ({ slug: row.slug, label: row.name })),
      }));
    },
    () => {
      const dept = staticDepartments.find((item) => item.slug === department);
      return (dept?.shopFilters ?? [])
        .filter((filter) => filter.slug !== "all")
        .map((filter) => ({ slug: filter.slug, label: filter.label, subcategories: [] }));
    },
  );
}

export async function loadRoom(slug: string): Promise<Taxonomy | null> {
  try {
    const match = (await roomsService.list())
      .map(toTaxonomy)
      .find((row) => row.slug === slug);
    if (match) return match;
  } catch (error) {
    report("loadRoom", error);
  }
  const fallback = getRoomBySlug(slug);
  return fallback ? toTaxonomy(fallback) : null;
}
