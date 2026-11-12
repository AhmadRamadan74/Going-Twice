"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { notificationsService, type NotificationDto } from "@/lib/api";
import { notificationHref } from "@/lib/api/services/notifications.service";
import { useAuth } from "@/lib/auth-context";

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function AlertsView() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/alerts");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    notificationsService
      .list()
      .then(setItems)
      .catch(() => setError("Could not load notifications."))
      .finally(() => setLoading(false));
  }, [user]);

  async function openNotification(item: NotificationDto) {
    if (!item.is_read) {
      try {
        await notificationsService.markRead(item.id);
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)),
        );
        window.dispatchEvent(new Event("notifications-changed"));
      } catch {
        /* still navigate */
      }
    }
    router.push(notificationHref(item, user?.role === "admin"));
  }

  async function markAllRead() {
    await notificationsService.markAllRead();
    setItems((prev) => prev.map((row) => ({ ...row, is_read: true })));
    window.dispatchEvent(new Event("notifications-changed"));
  }

  if (!ready || !user) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading alerts…
      </section>
    );
  }

  const unread = items.filter((item) => !item.is_read).length;

  return (
    <section className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted">Notifications</p>
          <h1 className="pt-2 font-display text-[36px] font-medium text-ink sm:text-[44px]">
            Alerts
          </h1>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="text-[13px] font-medium text-wine underline-offset-2 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="mt-3 h-px w-full bg-[rgba(107,90,74,0.2)]" />

      {error && <p className="pt-6 text-[13px] text-wine">{error}</p>}

      {loading ? (
        <p className="pt-10 text-center text-[14px] text-muted">Loading notifications…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">You&apos;re all caught up</p>
          <p className="pt-2 text-[14px] text-muted">
            {user.role === "admin"
              ? "When a seller submits a piece, it will appear here. Open it to review, approve, or reject."
              : "Order updates and listing messages will appear here."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openNotification(item)}
                className={`block w-full rounded-[8px] border-[0.8px] px-5 py-4 text-left transition-colors hover:bg-sand/40 ${
                  item.is_read
                    ? "border-[rgba(107,90,74,0.1)] bg-white"
                    : "border-[rgba(107,61,75,0.2)] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-medium text-ink">{item.title}</p>
                  <span className="shrink-0 text-[11px] text-muted">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                <p className="pt-1 text-[13px] leading-[20px] text-muted">{item.message}</p>
                {!item.is_read && (
                  <p className="pt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-wine">
                    New
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
