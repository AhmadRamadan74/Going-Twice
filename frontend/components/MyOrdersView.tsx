"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, ordersService, type OrderDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatEgp } from "@/lib/commerce";
import { mediaUrl } from "@/lib/media";
import { formatOrderDate } from "@/lib/order-display";
import ConfirmOrderModal, { type ConfirmOrderPreview } from "./ConfirmOrderModal";

type Tab = "buyer" | "seller";

type CardOrder = {
  key: string;
  title: string;
  image: string;
  partyLabel: string;
  dateLabel: string;
  orderNumber: string;
  handover: "pickup" | "shipping";
  price: number;
  viewHref?: string;
  mineConfirmed: boolean;
  completed: boolean;
  cancelled: boolean;
  confirmedAt?: string | null;
  role: Tab;
  confirm?: () => Promise<void> | void;
};

function fromApi(order: OrderDto, tab: Tab, onUpdated: (next: OrderDto) => void): CardOrder {
  const product = order.product;
  const title = product?.name || "Untitled piece";
  const image = mediaUrl(product?.image_url || "");
  const mineConfirmed =
    tab === "buyer" ? order.buyer_confirmed_payment : order.seller_confirmed_handover;
  const completed =
    order.status === "completed" || (order.buyer_confirmed_payment && order.seller_confirmed_handover);
  const confirmedAt =
    tab === "buyer" ? order.buyer_confirmed_payment_at : order.seller_confirmed_handover_at;

  return {
    key: `api-${order.id}`,
    title,
    image,
    partyLabel:
      tab === "buyer"
        ? `Seller: ${order.seller?.full_name || product?.seller_name || "Seller"}`
        : `Buyer: ${order.buyer?.full_name || "Buyer"}`,
    dateLabel: formatOrderDate(order.created_at),
    orderNumber: order.order_number,
    handover: order.handover_type === "shipping" ? "shipping" : "pickup",
    price: Number(order.price) || 0,
    viewHref: `/account/orders/${order.id}`,
    mineConfirmed,
    completed,
    cancelled: order.status === "cancelled",
    confirmedAt,
    role: tab,
    confirm: async () => {
      const next =
        tab === "buyer"
          ? await ordersService.confirmPayment(order.id)
          : await ordersService.confirmHandover(order.id);
      onUpdated(next);
    },
  };
}

function statusMeta(order: CardOrder) {
  if (order.cancelled) {
    return {
      label: "Cancelled",
      className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.08)] text-wine",
    };
  }
  if (order.completed) {
    return {
      label: "Completed",
      className: "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] text-[#3a6040]",
    };
  }
  if (order.mineConfirmed) {
    return {
      label: "Awaiting Counterparty Confirmation",
      className: "border-[rgba(107,90,74,0.2)] bg-[#ede0cc] text-muted",
    };
  }
  return {
    label: "Payment Completed",
    className: "border-[#fee685] bg-[#fffbeb] text-[#bb4d00]",
  };
}

export default function MyOrdersView() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<Tab>("buyer");
  const [buying, setBuying] = useState<OrderDto[]>([]);
  const [selling, setSelling] = useState<OrderDto[]>([]);
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<CardOrder | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account/orders");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([ordersService.mine(), ordersService.selling()])
      .then(([mine, sold]) => {
        setBuying(mine);
        setSelling(sold);
      })
      .catch(() => setError("Could not load your orders."))
      .finally(() => setLoading(false));
  }, [user]);

  const cards = useMemo(() => {
    const patch = (setter: typeof setBuying) => (next: OrderDto) => {
      setter((prev) => prev.map((row) => (row.id === next.id ? next : row)));
    };
    if (tab === "seller") {
      return selling.map((order) => fromApi(order, "seller", patch(setSelling)));
    }
    return buying.map((order) => fromApi(order, "buyer", patch(setBuying)));
  }, [tab, buying, selling]);

  async function onConfirm() {
    if (!confirming?.confirm) return;
    setPendingKey(confirming.key);
    setError("");
    try {
      await confirming.confirm();
      setConfirming(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm this order.");
    } finally {
      setPendingKey(null);
    }
  }

  if (!ready || !user) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading orders…
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[860px] px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-display text-[36px] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[44px]">
        My Orders
      </h1>

      <div className="mt-8 inline-flex overflow-hidden rounded-[2px] border-[0.8px] border-[rgba(107,90,74,0.25)]">
        {(["buyer", "seller"] as const).map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-8 py-3 text-[14px] font-medium leading-[21px] ${
                active ? "bg-wine text-white" : "bg-white text-muted"
              }`}
            >
              {value === "buyer" ? "As Buyer" : "As Seller"}
            </button>
          );
        })}
      </div>

      {error && <p className="pt-6 text-[13px] text-wine">{error}</p>}

      {loading ? (
        <p className="pt-10 text-center text-[14px] text-muted">Loading orders…</p>
      ) : cards.length === 0 ? (
        <div className="mt-8 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">
            {tab === "buyer" ? "No orders yet" : "No sales yet"}
          </p>
          <p className="pt-2 text-[14px] text-muted">
            {tab === "buyer"
              ? "When you complete a checkout, it will appear here."
              : "When a buyer purchases one of your pieces, it will appear here."}
          </p>
          {tab === "buyer" && (
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white"
            >
              Shop the Collection
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {cards.map((order) => {
            const status = statusMeta(order);
            const showConfirm = !order.cancelled && !order.completed && !order.mineConfirmed;
            const confirmedLabel = order.confirmedAt
              ? `Confirmed ${formatOrderDate(order.confirmedAt)}`
              : "Confirmed";

            return (
              <li
                key={order.key}
                className="rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-5"
              >
                <div className="flex gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
                    {order.image ? (
                      <Image
                        src={order.image}
                        alt={order.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-[17px] leading-[25.5px] text-ink">
                        {order.title}
                      </h2>
                      <span
                        className={`shrink-0 rounded-[2px] border-[0.8px] px-2.5 py-1 text-[11px] font-medium leading-[16.5px] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="pt-1.5 text-[12px] leading-[18px] text-muted">
                      {order.partyLabel}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <p className="text-[12px] leading-[18px] text-muted">
                        {order.dateLabel}
                        {order.dateLabel && order.orderNumber ? " · " : ""}
                        {order.orderNumber}
                      </p>
                      {order.handover === "shipping" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border-[0.8px] border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.05)] px-2 py-0.5 text-[11px] leading-[16.5px] text-wine">
                          <img
                            src="/icons/orders/shipping.svg"
                            alt=""
                            width={9}
                            height={9}
                            className="size-[9px]"
                          />
                          Shipping
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border-[0.8px] border-[rgba(107,90,74,0.2)] bg-[#f2e8d6] px-2 py-0.5 text-[11px] leading-[16.5px] text-muted">
                          <img
                            src="/icons/orders/pickup.svg"
                            alt=""
                            width={9}
                            height={9}
                            className="size-[9px]"
                          />
                          Self Pickup
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                      <p className="text-[13px] font-medium leading-[19.5px] text-wine">
                        {formatEgp(order.price)}
                      </p>
                      <div className="flex items-center gap-2">
                        {showConfirm ? (
                          <button
                            type="button"
                            disabled={pendingKey === order.key}
                            onClick={() => setConfirming(order)}
                            className="rounded-[2px] bg-wine px-4 py-2 text-[12px] font-medium leading-[18px] text-white disabled:opacity-60"
                          >
                            {pendingKey === order.key
                              ? "Confirming…"
                              : tab === "buyer"
                                ? "Confirm Receipt"
                                : "Confirm Handover"}
                          </button>
                        ) : !order.cancelled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border-[0.8px] border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] px-3 py-1.5 text-[12px] font-medium leading-[18px] text-[#3a6040]">
                            <img
                              src="/icons/orders/confirmed.svg"
                              alt=""
                              width={10}
                              height={10}
                              className="size-2.5"
                            />
                            {confirmedLabel}
                          </span>
                        ) : null}
                        {order.viewHref && (
                          <Link
                            href={order.viewHref}
                            className="inline-flex items-center gap-1 text-[12px] font-medium leading-[18px] text-muted hover:text-ink"
                          >
                            View
                            <img
                              src="/icons/orders/view.svg"
                              alt=""
                              width={12}
                              height={12}
                              className="size-3"
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirming && (
        <ConfirmOrderModal
          role={confirming.role}
          pending={pendingKey === confirming.key}
          preview={
            {
              title: confirming.title,
              image: confirming.image,
              partyLabel: confirming.partyLabel,
              price: confirming.price,
            } satisfies ConfirmOrderPreview
          }
          onCancel={() => setConfirming(null)}
          onConfirm={() => void onConfirm()}
        />
      )}
    </section>
  );
}
