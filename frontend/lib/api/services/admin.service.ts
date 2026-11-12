import { api } from "../client";
import { endpoints } from "../endpoints";
import type { OrderDto } from "./orders.service";
import type { SellListingDto } from "./sell.service";

export type AdminSeller = {
  id: number | null;
  full_name: string;
  email: string | null;
  phone_number: string | null;
};

export type AdminListingDto = SellListingDto & {
  description?: string;
  rejection_reason?: string | null;
  seller?: AdminSeller;
};

export type AdminDashboard = {
  pending_listings: number;
  published: number;
  rejected: number;
  sold: number;
  orders: number;
  users: number;
};

export type AdminListingStatus =
  | "pending_review"
  | "published"
  | "rejected"
  | "sold"
  | "draft";

type ListingsPage = {
  items: AdminListingDto[];
  total: number;
  page: number;
  per_page: number;
};

export type AdminOrdersPage = {
  items: OrderDto[];
  total: number;
  page: number;
  per_page: number;
};

export const adminService = {
  async dashboard() {
    const { data } = await api.get<AdminDashboard>(endpoints.admin.dashboard);
    return data;
  },

  async listings(status: AdminListingStatus, page = 1) {
    const { data } = await api.get<ListingsPage>(endpoints.admin.listings, {
      params: { status, page, per_page: 24 },
    });
    return data;
  },

  async approve(id: number) {
    const { data } = await api.post<AdminListingDto>(endpoints.admin.approve(id));
    return data;
  },

  async reject(id: number, rejection_reason: string) {
    const { data } = await api.post<AdminListingDto>(endpoints.admin.reject(id), {
      rejection_reason,
    });
    return data;
  },

  async orders(page = 1, status?: string) {
    const { data } = await api.get<AdminOrdersPage>(endpoints.admin.orders, {
      params: { page, per_page: 24, ...(status ? { status } : {}) },
    });
    return data;
  },
};
