"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, ordersService, type OrderDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatEgp } from "@/lib/commerce";
import { mediaUrl } from "@/lib/media";
import {
  catalogPath,
  formatOrderDate,
  initials,
  paymentMethodLabel,
} from "@/lib/order-display";
import ConfirmOrderModal from "./ConfirmOrderModal";
import SellerPayoutDetails from "./SellerPayoutDetails";

function statusBadge(order: OrderDto) {
  if (order.status === "cancelled") {
    return {
      label: "Cancelled",
      className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.08)] text-wine",
    };
  }
  if (order.status === "completed") {
    return {
      label: "Completed",
      className: "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] text-[#3a6040]",
    };
  }
  return {
    label: "Payment Completed",
    className: "border-[#fee685] bg-[#fffbeb] text-[#bb4d00]",
  };
}

function Step({
  index,
  label,
  date,
  done,
  current,
}: {
  index: number;
  label: string;
  date?: string;
  done: boolean;
  current: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div
        className={`grid size-8 place-items-center rounded-full border-[1.6px] ${
          done
            ? "border-[#a8b59a] bg-[#a8b59a]"
            : current
              ? "border-wine bg-white"
              : "border-[rgba(107,90,74,0.3)] bg-white"
        }`}
      >
        {done ? (
          <img src="/icons/orders/step-check.svg" alt="" width={12} height={12} className="size-3" />
        ) : (
          <span className={`text-[10px] font-medium ${current ? "text-wine" : "text-muted"}`}>
            {index}
          </span>
        )}
      </div>
      <p
        className={`text-[10px] leading-[12.5px] ${
          done || current ? "font-medium text-ink" : "text-muted"
        } ${current ? "text-wine" : ""}`}
      >
        {label}
      </p>
      {date ? <p className="text-[9px] leading-[13.5px] text-muted">{date}</p> : null}
    </div>
  );
}

export default function OrderDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const orderId = Number(decodeURIComponent(String(params.id || "")));

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=/account/orders/${params.id}`);
  }, [ready, user, router, params.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      if (!Number.isInteger(orderId) || orderId <= 0) {
        if (!cancelled) {
          setOrder(null);
          setError("This order is not available.");
          setLoading(false);
        }
        return;
      }

      try {
        const data = await ordersService.get(orderId);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) {
          setOrder(null);
          setError(err instanceof ApiError ? err.message : "Could not load this order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, orderId]);

  async function confirm() {
    if (!order) return;
    setPending(true);
    setError("");
    try {
      const next =
        order.perspective === "seller"
          ? await ordersService.confirmHandover(order.id)
          : await ordersService.confirmPayment(order.id);
      setOrder(next);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm this order.");
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user || loading) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading order…
      </section>
    );
  }

  if (!order) {
    return (
      <section className="mx-auto max-w-[900px] px-4 py-16 text-center sm:px-6">
        <p className="font-display text-[28px] text-ink">Order not found</p>
        <p className="pt-2 text-[14px] text-muted">
          {error === "You cannot view this order"
            ? "This order belongs to another account. Log in as the buyer or seller, or open View from your My Orders list."
            : error || "This order is not available."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/account/orders" className="text-[13px] font-medium text-wine">
            Back to Orders
          </Link>
          <Link
            href="/login?next=/account/orders/2"
            className="text-[13px] font-medium text-muted hover:text-ink"
          >
            Log in as buyer to view sample orders
          </Link>
        </div>
      </section>
    );
  }

  const product = order.product;
  const title = product?.name || "Untitled piece";
  const image = mediaUrl(product?.image_url || "");
  const price = Number(order.price) || 0;
  const placedOn = formatOrderDate(order.created_at);
  const sellerName = order.seller?.full_name || product?.seller_name || "Seller";
  const buyerName = order.buyer?.full_name || "Buyer";
  const isSeller = order.perspective === "seller";
  const counterparty = isSeller
    ? { name: buyerName, phone: order.buyer?.phone_number }
    : { name: sellerName, phone: order.seller?.phone_number };
  const mineConfirmed = isSeller
    ? order.seller_confirmed_handover
    : order.buyer_confirmed_payment;
  const mineConfirmedAt = isSeller
    ? order.seller_confirmed_handover_at
    : order.buyer_confirmed_payment_at;
  const completed =
    order.status === "completed" ||
    (order.buyer_confirmed_payment && order.seller_confirmed_handover);
  const cancelled = order.status === "cancelled";
  const showConfirm = !cancelled && !completed && !mineConfirmed;
  const badge = statusBadge(order);
  const pickup = order.handover_type !== "shipping";
  const paidOn = formatOrderDate(order.created_at);

  const steps = [
    { label: "Order Placed", date: placedOn, done: true },
    { label: "Payment Completed", date: paidOn, done: true },
    {
      label: "Seller Confirmed Handover",
      date: formatOrderDate(order.seller_confirmed_handover_at),
      done: order.seller_confirmed_handover,
    },
    {
      label: "Buyer Confirmed Receipt",
      date: formatOrderDate(order.buyer_confirmed_payment_at),
      done: order.buyer_confirmed_payment,
    },
    {
      label: "Transaction Closed",
      date: completed ? formatOrderDate(order.buyer_confirmed_payment_at) : "",
      done: completed,
    },
  ];
  const currentIndex = steps.findIndex((step) => !step.done);

  let handoverNote = "Awaiting both parties to confirm handover";
  if (completed) handoverNote = "Handover completed";
  else if (order.buyer_confirmed_payment && !order.seller_confirmed_handover) {
    handoverNote = `Waiting for ${sellerName} to confirm`;
  } else if (order.seller_confirmed_handover && !order.buyer_confirmed_payment) {
    handoverNote = `Waiting for ${buyerName} to confirm`;
  }

  return (
    <section className="mx-auto max-w-[900px] px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <img src="/icons/orders/view.svg" alt="" width={13} height={13} className="size-[13px] rotate-180" />
        Back to Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 pt-8">
        <div>
          <h1 className="font-display text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink sm:text-[36px]">
            Order {order.order_number}
          </h1>
          <p className="pt-1 text-[13px] text-muted">{placedOn}</p>
        </div>
        <span
          className={`rounded-[2px] border-[0.8px] px-3 py-1.5 text-[12px] font-medium leading-[18px] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {error && <p className="pt-4 text-[13px] text-wine">{error}</p>}

      <article className="mt-8 overflow-hidden rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white">
        <div className="relative h-[240px] bg-[#ede0cc] sm:h-[372px]">
          {image ? (
            <Image src={image} alt={title} fill sizes="900px" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(59,42,36,0.45)] to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <p className="font-display text-[24px] leading-[1.2] tracking-[-0.02em] text-[#f2e8d6] sm:text-[28px]">
              {title}
            </p>
            <p className="pt-1 text-[16px] font-semibold text-[#f2e8d6] sm:text-[18px]">
              {formatEgp(price)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            {product?.condition ? (
              <span className="rounded-[2px] border-[0.8px] border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] px-2.5 py-1 text-[12px] font-medium text-[#3a6040]">
                {product.condition}
              </span>
            ) : null}
            {pickup ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[0.8px] border-[rgba(107,90,74,0.2)] bg-[#f2e8d6] px-2.5 py-1 text-[12px] text-muted">
                <img src="/icons/orders/pickup.svg" alt="" width={11} height={11} className="size-[11px]" />
                Self Pickup
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[0.8px] border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.05)] px-2.5 py-1 text-[12px] text-wine">
                <img src="/icons/orders/shipping.svg" alt="" width={11} height={11} className="size-[11px]" />
                Shipping
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted">
            {catalogPath(product?.department, product?.category_slug)}
          </p>
        </div>
      </article>

      <div className="mt-6 overflow-x-auto rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-6">
        <div className="relative flex min-w-[640px] items-start">
          <div className="absolute left-4 right-4 top-4 h-px bg-[rgba(107,90,74,0.15)]" />
          {steps.map((step, index) => (
            <Step
              key={step.label}
              index={index + 1}
              label={step.label}
              date={step.date}
              done={step.done}
              current={index === currentIndex}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[8px] border-[0.8px] border-[rgba(168,181,154,0.4)] bg-white p-6">
        <div className="flex items-center gap-3">
          <img src="/icons/orders/payment.svg" alt="" width={20} height={20} className="size-5" />
          <h2 className="font-display text-[20px] font-medium text-ink">Payment Status</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Status</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-[2px] border-[0.8px] border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] px-2.5 py-1 text-[13px] font-medium text-[#3a6040]">
              <img src="/icons/orders/confirmed.svg" alt="" width={10} height={10} className="size-2.5" />
              Payment Completed
            </span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Date Paid</p>
            <p className="pt-1 text-[14px] font-medium text-ink">{paidOn || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Method</p>
            <p className="pt-1 text-[14px] font-medium text-ink">
              {paymentMethodLabel(order.payment_method)}
            </p>
          </div>
        </div>
        {order.payout ? (
          <SellerPayoutDetails
            order={order}
            heading={
              isSeller ? "Details shared with the buyer" : "Pay the seller directly"
            }
          />
        ) : null}
      </div>

      <div className="mt-6 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-6">
        <h2 className="font-display text-[22px] font-medium text-ink">Handover Status</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <HandoverCard
            label="Seller Confirmation"
            name={sellerName}
            confirmed={order.seller_confirmed_handover}
            confirmedAt={order.seller_confirmed_handover_at}
          />
          <HandoverCard
            label="Buyer Confirmation"
            name={buyerName}
            confirmed={order.buyer_confirmed_payment}
            confirmedAt={order.buyer_confirmed_payment_at}
          />
        </div>
        <p className="mt-5 rounded-[4px] border-[0.8px] border-[rgba(107,90,74,0.15)] bg-[#ede0cc] px-5 py-3 text-[13px] text-muted">
          {handoverNote}
        </p>
      </div>

      <div className="mt-6 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-6">
        <h2 className="font-display text-[20px] font-medium text-ink">Counterparty</h2>
        <div className="flex items-center gap-3 pt-4">
          <span className="grid size-10 place-items-center rounded-full bg-[#ede0cc] font-display text-[15px] font-medium text-wine">
            {initials(counterparty.name)}
          </span>
          <p className="font-display text-[16px] text-ink">{counterparty.name}</p>
        </div>
        {counterparty.phone ? (
          <p className="flex items-center gap-1.5 pt-3 text-[13px] text-muted">
            <img src="/icons/orders/phone.svg" alt="" width={12} height={12} className="size-3" />
            {counterparty.phone}
          </p>
        ) : null}
      </div>

      {showConfirm ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mt-6 w-full rounded-[2px] bg-wine py-3.5 text-[15px] font-medium text-white"
        >
          {isSeller ? "Confirm Handover" : "Confirm Receipt"}
        </button>
      ) : !cancelled ? (
        <p className="mt-6 flex items-center justify-center gap-2 rounded-[2px] border-[0.8px] border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.15)] py-3.5 text-[14px] font-medium text-[#3a6040]">
          <img src="/icons/orders/confirmed.svg" alt="" width={14} height={14} className="size-3.5" />
          You confirmed{mineConfirmedAt ? ` on ${formatOrderDate(mineConfirmedAt)}` : ""}
        </p>
      ) : null}

      {confirmOpen && (
        <ConfirmOrderModal
          role={isSeller ? "seller" : "buyer"}
          pending={pending}
          preview={{
            title,
            image,
            partyLabel: isSeller ? `Buyer: ${buyerName}` : `Seller: ${sellerName}`,
            price,
          }}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void confirm()}
        />
      )}
    </section>
  );
}

function HandoverCard({
  label,
  name,
  confirmed,
  confirmedAt,
}: {
  label: string;
  name: string;
  confirmed: boolean;
  confirmedAt?: string | null;
}) {
  return (
    <div
      className={`rounded-[6px] border-[0.8px] p-5 ${
        confirmed
          ? "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.05)]"
          : "border-[rgba(107,90,74,0.15)] bg-[rgba(242,232,214,0.5)]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="flex items-center gap-3 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-[#ede0cc] font-display text-[14px] font-medium text-wine">
          {initials(name)}
        </span>
        <p className="font-display text-[15px] text-ink">{name}</p>
      </div>
      {confirmed ? (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#3a6040]">
          <img src="/icons/orders/confirmed.svg" alt="" width={13} height={13} className="size-[13px]" />
          Confirmed{confirmedAt ? ` on ${formatOrderDate(confirmedAt)}` : ""}
        </p>
      ) : (
        <p className="text-[12px] text-muted">Pending</p>
      )}
    </div>
  );
}
