import { api } from "../client";
import { endpoints } from "../endpoints";

export type OrderParty = {
  id?: number | null;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

export type OrderProduct = {
  id?: number;
  slug?: string;
  name?: string;
  image_url?: string | null;
  seller_name?: string | null;
  condition?: string | null;
  category_slug?: string | null;
  department?: string | null;
};

export type OrderDto = {
  id: number;
  order_number: string;
  status: string;
  price: string | number;
  currency?: string;
  payment_method?: string;
  buyer_confirmed_payment: boolean;
  buyer_confirmed_payment_at?: string | null;
  seller_confirmed_handover: boolean;
  seller_confirmed_handover_at?: string | null;
  handover_type?: string | null;
  handover_location?: string | null;
  handover_time?: string | null;
  handover_notes?: string | null;
  payout?: {
    method?: string;
    handle?: string | null;
    phone_number?: string | null;
    pickup_address?: string | null;
    bank_holder?: string | null;
    bank_name?: string | null;
    iban?: string | null;
  } | null;
  pickup_address?: string | null;
  created_at: string | null;
  perspective?: "buyer" | "seller";
  buyer?: OrderParty | null;
  seller?: OrderParty | null;
  product?: OrderProduct | null;
};

export type HandoverType = "self_pickup" | "shipping";

export type CheckoutPayload = {
  payment_method: string;
  handover_location?: string;
  handover_time?: string;
  handover_notes?: string;
  /** Applied to every order this checkout creates. */
  handover_type?: HandoverType;
  /** Per-piece override, keyed by product id. */
  item_handover?: Record<number, string>;
};

export type UpdateHandoverPayload = {
  handover_location?: string;
  handover_time?: string;
  handover_notes?: string;
  handover_type?: HandoverType;
};

export const ordersService = {
  /**
   * Creates the real orders from the server-side cart — one per cart item,
   * since every piece is unique and has its own seller.
   */
  async checkout(payload: CheckoutPayload) {
    const { data } = await api.post<OrderDto[]>(endpoints.orders.checkout, payload);
    return Array.isArray(data) ? data : [];
  },

  async mine() {
    const { data } = await api.get<OrderDto[]>(endpoints.orders.mine);
    return Array.isArray(data) ? data : [];
  },

  async selling() {
    const { data } = await api.get<OrderDto[]>(endpoints.orders.selling);
    return Array.isArray(data) ? data : [];
  },

  async get(id: number) {
    const { data } = await api.get<OrderDto>(endpoints.orders.detail(id));
    return data;
  },

  async confirmPayment(id: number) {
    const { data } = await api.post<OrderDto>(endpoints.orders.confirmPayment(id));
    return data;
  },

  async confirmHandover(id: number) {
    const { data } = await api.post<OrderDto>(endpoints.orders.confirmHandover(id));
    return data;
  },

  async updateHandover(id: number, payload: UpdateHandoverPayload) {
    const { data } = await api.patch<OrderDto>(endpoints.orders.handover(id), payload);
    return data;
  },
};
