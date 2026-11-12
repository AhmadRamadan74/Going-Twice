import { api } from "../client";
import { endpoints } from "../endpoints";

export type ListPiecePayload = {
  title: string;
  description: string;
  asking_price?: number;
  category?: string;
  department?: string;
  subcategory_id?: number;
  material_id?: number;
  dimensions?: string;
  era?: string;
  condition?: string;
  seller_name: string;
  seller_email: string;
  seller_phone: string;
  city?: string;
  image_url?: string;
  image_urls?: string[];
  payment_methods?: string[];
  save_as_draft?: boolean;
};

export type SellListingDto = {
  id: number;
  slug?: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  asking_price?: number | string | null;
  category?: string | null;
  room?: string | null;
  condition?: string | null;
  location_city?: string | null;
  rejection_reason?: string | null;
  image_url?: string | null;
  images?: string[];
  payment_methods?: string[];
  department?: string | null;
  era?: string | null;
  dimensions?: string | null;
  subcategory_id?: number | null;
  subcategory_name?: string | null;
  material_id?: number | null;
  material_name?: string | null;
};

export type UpdateListingPayload = Partial<
  Omit<ListPiecePayload, "seller_name" | "seller_email" | "seller_phone" | "save_as_draft">
> & {
  room?: string;
};

type MineListingsResponse = {
  items: SellListingDto[];
};

export const sellService = {
  async listPiece(payload: ListPiecePayload) {
    const { data } = await api.post<SellListingDto>(endpoints.sell.listPiece, payload);
    return data;
  },

  async uploadImages(files: File[]) {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    const { data } = await api.post<{ urls: string[] }>(endpoints.uploads.root, form);
    return data.urls ?? [];
  },

  async processMainPhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ original_url: string; white_bg_url: string | null }>(
      endpoints.uploads.mainPhoto,
      form,
      { timeout: 30000 },
    );
    return data;
  },

  async mine() {
    const { data } = await api.get<MineListingsResponse | SellListingDto[]>(
      endpoints.sell.mine,
    );
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  },

  async get(id: number) {
    const { data } = await api.get<SellListingDto>(endpoints.sell.detail(id));
    return data;
  },

  async update(id: number, payload: UpdateListingPayload) {
    const { data } = await api.patch<SellListingDto>(endpoints.sell.detail(id), payload);
    return data;
  },

  async resubmit(id: number) {
    const { data } = await api.post<SellListingDto>(endpoints.sell.resubmit(id));
    return data;
  },
};
