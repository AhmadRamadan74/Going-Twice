import { api } from "../client";
import { endpoints } from "../endpoints";
import type { Paginated } from "../types";

export type ProductDto = {
  id: number;
  slug: string;
  name: string;
  seller_name: string;
  seller_user_id?: number | null;
  price: number | string;
  currency: string;
  price_display: string;
  image_url: string;
  images?: { id: number; image_url: string; is_primary: boolean; sort_order: number }[];
  description: string;
  condition?: string | null;
  dimensions?: string | null;
  era?: string | null;
  category_slug: string;
  department: string;
  room_slug: string;
  subcategory_id?: number | null;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  material_id?: number | null;
  material_name?: string | null;
  collection?: string | null;
  listed_at: string;
};

export type ProductListParams = {
  page?: number;
  per_page?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "name" | string;
  category?: string;
  department?: string;
  subcategory?: string;
  subcategory_id?: number;
  material_id?: number;
  room?: string;
  collection?: string;
  q?: string;
};

type BackendPage<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export type ProductDetailDto = {
  product: ProductDto;
  related: ProductDto[];
};

export const productsService = {
  async list(params?: ProductListParams): Promise<Paginated<ProductDto>> {
    const { data } = await api.get<BackendPage<ProductDto>>(endpoints.products.list, {
      params,
    });
    return {
      items: data.items,
      page: data.page,
      pageSize: data.per_page,
      total: data.total,
      totalPages: data.pages,
    };
  },

  async getBySlug(slug: string) {
    const { data } = await api.get<ProductDetailDto>(endpoints.products.detail(slug));
    return data;
  },

  async justListed() {
    const { data } = await api.get<ProductDto[]>(endpoints.products.justListed);
    return data;
  },

  async editorsPicks() {
    const { data } = await api.get<ProductDto[]>(endpoints.products.editorsPicks);
    return data;
  },
};
