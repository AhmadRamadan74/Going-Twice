"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminService, ApiError, type OrderDto } from "@/lib/api";
import { formatEgp } from "@/lib/commerce";
import { mediaUrl } from "@/lib/media";
import { formatOrderDate, paymentMethodLabel } from "@/lib/order-display";

const STATUS_STYLES: Record<string, string> = {
  order_placed: "border-[#fee685] bg-[#fffbeb] text-[#bb4d00]",
  completed: "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] text-[#3a6040]",
  cancelled: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.08)] text-wine",
};

const STATUS_LABELS: Record<string, string> = {
  order_placed: "Order Placed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function AdminOrdersPanel() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminService
      .orders()
      .then((page) => {
        if (cancelled) return;
        setOrders(page.items || []);
        setTotal(page.total || 0);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="pt-10 text-center text-[14px] text-muted">Loading orders…</p>;
  }

  if (error) {
    return <p className="pt-5 text-[13px] text-wine">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="mt-10 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
        <p className="font-display text-[24px] text-ink">No orders yet</p>
        <p className="pt-2 text-[14px] text-muted">
          Orders placed across the marketplace will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="pt-6 text-[13px] text-muted">
        {total} order{total === 1 ? "" : "s"} across the marketplace.
      </p>
      <ul className="mt-4 space-y-4">
        {orders.map((order) => {
          const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.order_placed;
          const label = STATUS_LABELS[order.status] ?? order.status;
          return (
            <li
              key={order.id}
              className="rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-4 sm:p-5"
            >
              <div className="flex gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
                  {order.product?.image_url ? (
                    <Image
                      src={mediaUrl(order.product.image_url)}
                      alt={order.product.name || "Piece"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-display text-[17px] leading-[25.5px] text-ink">
                      {order.product?.name || "Untitled piece"}
                    </h3>
                    <span
                      className={`shrink-0 rounded-[2px] border-[0.8px] px-2.5 py-1 text-[11px] font-medium leading-[16.5px] ${style}`}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="pt-1.5 text-[12px] leading-[18px] text-muted">
                    {order.order_number} · {formatOrderDate(order.created_at)}
                  </p>
                  <p className="pt-0.5 text-[12px] leading-[18px] text-muted">
                    Buyer: {order.buyer?.full_name || "—"} · Seller:{" "}
                    {order.seller?.full_name || order.product?.seller_name || "—"}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-[13px] font-medium leading-[19.5px] text-wine">
                      {formatEgp(Number(order.price) || 0)}
                    </p>
                    <p className="text-[12px] leading-[18px] text-muted">
                      {paymentMethodLabel(order.payment_method)} ·{" "}
                      {order.handover_type === "shipping" ? "Shipping" : "Self Pickup"}
                    </p>
                  </div>
                  <p className="pt-1.5 text-[12px] leading-[18px] text-muted">
                    Payment {order.buyer_confirmed_payment ? "confirmed" : "pending"} ·
                    Handover {order.seller_confirmed_handover ? "confirmed" : "pending"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
