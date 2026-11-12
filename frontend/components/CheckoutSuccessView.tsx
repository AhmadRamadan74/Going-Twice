"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ordersService, type OrderDto } from "@/lib/api";
import { formatOrderDate, paymentMethodLabel } from "@/lib/order-display";
import SellerPayoutDetails from "./SellerPayoutDetails";

function SuccessInner() {
  const searchParams = useSearchParams();
  const orderId = Number(searchParams.get("order"));
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    ordersService
      .get(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        /* the order exists — the receipt panel is just unavailable */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <section className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-[520px] rounded-[4px] border-[0.8px] border-line bg-white p-8 text-center sm:p-10">
        <p className="eyebrow text-wine">Order Placed</p>
        <h1 className="pt-3 font-display text-[32px] font-medium text-ink">
          Your order has been placed
        </h1>
        <p className="pt-3 text-[14px] leading-[22px] text-muted">
          The seller has been notified. Pay them directly, arrange handover, then confirm
          payment from your orders page.
        </p>

        {loading ? (
          <p className="pt-8 text-[13px] text-muted">Loading your order…</p>
        ) : order ? (
          <>
            <dl className="mt-8 space-y-2 text-left text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Order Number</dt>
                <dd className="text-ink">{order.order_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Piece</dt>
                <dd className="text-ink">{order.product?.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Seller</dt>
                <dd className="text-ink">
                  {order.seller?.full_name || order.product?.seller_name || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Date Placed</dt>
                <dd className="text-ink">{formatOrderDate(order.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Payment Method</dt>
                <dd className="text-ink">{paymentMethodLabel(order.payment_method)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Handover</dt>
                <dd className="text-ink">
                  {order.handover_type === "shipping" ? "Shipping" : "Self Pickup"}
                </dd>
              </div>
            </dl>
            <SellerPayoutDetails order={order} />
          </>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="rounded-[2px] bg-wine px-5 py-3 text-[13px] font-medium text-white"
          >
            View My Orders
          </Link>
          <Link
            href="/shop"
            className="rounded-[2px] border-[0.8px] border-line px-5 py-3 text-[13px] font-medium text-ink"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutSuccessView() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
