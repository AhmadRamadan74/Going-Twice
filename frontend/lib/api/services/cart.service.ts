import { api } from "../client";
import { endpoints } from "../endpoints";
import type { ProductDto } from "./products.service";

export type CartItemDto = {
  id: number;
  product_id: number;
  price_at_addition: string;
  quantity: number;
  available: boolean;
  product: ProductDto | null;
};

export type CartDto = {
  items: CartItemDto[];
  item_count: number;
  total: string;
  currency: string;
};

export const emptyCart: CartDto = {
  items: [],
  item_count: 0,
  total: "0",
  currency: "EGP",
};

export const cartService = {
  async get() {
    const { data } = await api.get<CartDto>(endpoints.cart.root);
    return data ?? emptyCart;
  },

  async addItem(productId: number) {
    const { data } = await api.post<CartDto>(endpoints.cart.items, {
      product_id: productId,
    });
    return data ?? emptyCart;
  },

  async removeItem(productId: number) {
    const { data } = await api.delete<CartDto>(endpoints.cart.item(productId));
    return data ?? emptyCart;
  },

  async clear() {
    const { data } = await api.delete<CartDto>(endpoints.cart.root);
    return data ?? emptyCart;
  },
};
