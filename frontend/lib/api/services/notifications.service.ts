import { api } from "../client";
import { endpoints } from "../endpoints";

export type NotificationDto = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationsPage = {
  items: NotificationDto[];
  total: number;
  page: number;
  per_page: number;
};

export function notificationHref(
  notification: Pick<NotificationDto, "type" | "link">,
  isAdmin = false,
) {
  if (notification.link) return notification.link;
  if (notification.type === "listing_submitted") {
    return isAdmin ? "/admin" : "/account/uploads";
  }
  if (
    notification.type === "listing_approved" ||
    notification.type === "listing_rejected"
  ) {
    return "/account/uploads";
  }
  if (
    notification.type === "order_placed" ||
    notification.type === "payment_confirmed" ||
    notification.type === "handover_confirmed" ||
    notification.type === "order_completed"
  ) {
    return "/account/orders";
  }
  return "/alerts";
}

export const notificationsService = {
  async list() {
    const { data } = await api.get<NotificationsPage>(endpoints.notifications.list, {
      params: { per_page: 50 },
    });
    return data.items ?? [];
  },

  async unreadCount() {
    const { data } = await api.get<{ count: number }>(endpoints.notifications.unreadCount);
    return data.count ?? 0;
  },

  async markRead(id: number) {
    await api.post(endpoints.notifications.read(id));
  },

  async markAllRead() {
    await api.post(endpoints.notifications.readAll);
  },
};
