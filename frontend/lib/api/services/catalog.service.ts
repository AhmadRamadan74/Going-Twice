import { api } from "../client";
import { endpoints } from "../endpoints";

export type CategoryDto = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  department?: string | null;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
};

export type RoomDto = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
};

export type MaterialDto = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type BackendPage<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export type CreateCategoryInput = {
  name: string;
  description?: string | null;
  image_url?: string | null;
  department?: string | null;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  clear_parent?: boolean;
};

export const categoriesService = {
  async list(params?: { department?: string }) {
    const { data } = await api.get<BackendPage<CategoryDto>>(endpoints.categories.list, {
      params: { ...params, per_page: 100 },
    });
    return data.items;
  },

  async listForAdmin() {
    const { data } = await api.get<BackendPage<CategoryDto>>(endpoints.categories.list, {
      params: { include_inactive: true, per_page: 100 },
    });
    return data.items;
  },

  async getBySlug(slug: string) {
    const { data } = await api.get<CategoryDto>(endpoints.categories.detail(slug));
    return data;
  },

  async create(input: CreateCategoryInput) {
    const { data } = await api.post<CategoryDto>(endpoints.categories.create, input);
    return data;
  },

  async update(id: number, input: UpdateCategoryInput) {
    const { data } = await api.patch<CategoryDto>(endpoints.categories.update(id), input);
    return data;
  },

  async remove(id: number) {
    await api.delete(endpoints.categories.remove(id));
  },
};

export const roomsService = {
  async list() {
    const { data } = await api.get<BackendPage<RoomDto>>(endpoints.rooms.list);
    return data.items;
  },
};

export type CreateMaterialInput = {
  name: string;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

export const materialsService = {
  async list() {
    const { data } = await api.get<BackendPage<MaterialDto>>(endpoints.materials.list);
    return data.items;
  },

  async listForAdmin() {
    const { data } = await api.get<BackendPage<MaterialDto>>(endpoints.materials.list, {
      params: { include_inactive: true, per_page: 100 },
    });
    return data.items;
  },

  async create(input: CreateMaterialInput) {
    const { data } = await api.post<MaterialDto>(endpoints.materials.create, input);
    return data;
  },

  async update(id: number, input: UpdateMaterialInput) {
    const { data } = await api.patch<MaterialDto>(endpoints.materials.update(id), input);
    return data;
  },

  async remove(id: number) {
    await api.delete(endpoints.materials.remove(id));
  },
};
