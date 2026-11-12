import { api } from "../client";
import { endpoints } from "../endpoints";
import type { ProductDto } from "./products.service";

export type WishlistItemDto = {
  id: number;
  product_id: number;
  created_at: string | null;
  product: ProductDto;
};

export const wishlistService = {
  async list() {
    const { data } = await api.get<WishlistItemDto[]>(endpoints.wishlist.root);
    return Array.isArray(data) ? data : [];
  },

  async add(productId: number) {
    const { data } = await api.post<WishlistItemDto>(endpoints.wishlist.root, {
      product_id: productId,
    });
    return data;
  },

  async remove(productId: number) {
    await api.delete(endpoints.wishlist.item(productId));
  },
};
