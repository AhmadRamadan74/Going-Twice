import type { ArticleDto, FaqDto, ProductDto } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type {
  Article,
  CategorySlug,
  DepartmentSlug,
  Product,
  RoomSlug,
} from "@/lib/data";

function asNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function mapProduct(dto: ProductDto): Product {
  const gallery = (dto.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => mediaUrl(img.image_url));

  return {
    id: dto.slug || String(dto.id),
    backendId: dto.id,
    sellerUserId: dto.seller_user_id ?? undefined,
    name: dto.name,
    seller: dto.seller_name,
    price: dto.price_display,
    priceValue: asNumber(dto.price),
    image: mediaUrl(dto.image_url),
    images: gallery.length > 0 ? gallery : [mediaUrl(dto.image_url)],
    category: dto.category_slug as CategorySlug,
    department: dto.department as DepartmentSlug,
    room: dto.room_slug as RoomSlug,
    description: dto.description,
    condition: dto.condition || "Vintage",
    dimensions: dto.dimensions || "See listing",
    era: dto.era || "Vintage",
    collection: dto.collection as Product["collection"],
    listedAt: dto.listed_at?.slice(0, 10) || "",
  };
}

export function mapArticle(dto: ArticleDto): Article {
  return {
    slug: dto.slug,
    tag: dto.tag,
    title: dto.title,
    excerpt: dto.excerpt,
    image: mediaUrl(dto.image_url),
    href: `/journal/${dto.slug}`,
    date: dto.published_at?.slice(0, 10) || "",
    body: dto.body_paragraphs || [],
  };
}

export function mapFaq(dto: FaqDto) {
  return { q: dto.question, a: dto.answer };
}
