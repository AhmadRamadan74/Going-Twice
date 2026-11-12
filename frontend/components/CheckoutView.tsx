"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, ordersService } from "@/lib/api";
import { useRequireVerified } from "@/lib/verified";
import { formatEgp, useCommerce } from "@/lib/commerce";
import Breadcrumbs from "./Breadcrumbs";

const field =
  "mt-1.5 w-full rounded-[4px] border-[0.8px] border-line bg-white px-3 py-3 text-[14px] text-ink outline-none placeholder:text-muted/50 focus:border-ink";

/** Labels shown to the buyer, mapped to the values the API accepts. */
const PAYMENT_METHODS = [
  { value: "instapay", label: "InstaPay" },
  { value: "vodafone_cash", label: "Vodafone Cash" },
  { value: "etisalat_cash", label: "Etisalat Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export default function CheckoutView() {
  const router = useRouter();
  const { user, ready, allowed } = useRequireVerified("/checkout");
  const { cart, cartTotal, loading, refresh } = useCommerce();
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!ready || !user || !allowed || loading) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading checkout…
      </section>
    );
  }

  if (!cart.length) {
    return (
      <section className="container-page py-16 text-center">
        <p className="font-display text-[28px] text-ink">Your cart is empty</p>
        <Link href="/shop" className="mt-4 inline-block text-[14px] text-wine">
          Shop the collection
        </Link>
      </section>
    );
  }

  async function confirm() {
    setPending(true);
    setError("");
    try {
      const itemHandover: Record<number, string> = {};
      for (const line of cart) {
        if (line.product.backendId) {
          itemHandover[line.product.backendId] =
            line.delivery === "shipping" ? "shipping" : "self_pickup";
        }
      }

      const orders = await ordersService.checkout({
        payment_method: method,
        item_handover: itemHandover,
        ...(location.trim() ? { handover_location: location.trim() } : {}),
        ...(notes.trim() ? { handover_notes: notes.trim() } : {}),
      });

      // Checkout empties the server cart, so pull the now-empty state back.
      await refresh();

      const first = orders[0];
      router.push(
        first
          ? `/checkout/success?order=${encodeURIComponent(String(first.id))}`
          : "/account/orders",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not place your order. Try again.",
      );
      // A rejected checkout usually means a piece sold — resync the cart.
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />
      <section className="container-page grid gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[4px] border-[0.8px] border-line bg-white p-6 sm:p-8">
          <h1 className="font-display text-[32px] font-medium text-ink">Checkout</h1>

          {error && (
            <p className="mt-5 rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">
              {error}
            </p>
          )}

          <h2 className="pt-8 font-display text-[20px] text-ink">Handover Details</h2>
          <p className="pt-2 text-[14px] text-muted">
            Self pickup from the seller&apos;s address, or shipping arranged directly with
            them. Each piece keeps the choice you made in your cart.
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Preferred Location <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={255}
                placeholder="Zamalek, Cairo"
                className={field}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Notes for the Seller{" "}
                <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Weekday evenings work best for me."
                className={`${field} resize-none`}
              />
            </label>
          </div>

          <h2 className="pt-8 font-display text-[20px] text-ink">Payment Method</h2>
          <p className="pt-2 text-[13px] text-muted">
            Payment is made directly to the seller. Going Twice does not process payments.
          </p>
          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-[2px] border-[0.8px] px-4 py-3 text-[14px] ${
                  method === option.value ? "border-ink bg-sand/50" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            className="mt-8 w-full rounded-[2px] bg-wine py-3.5 text-[14px] font-medium text-white disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {pending ? "Placing Order…" : "Confirm Order"}
          </button>
        </div>

        <aside className="h-fit rounded-[4px] border-[0.8px] border-line bg-white p-5">
          <h2 className="font-display text-[22px] text-ink">Order Summary</h2>
          <ul className="mt-4 space-y-3">
            {cart.map((item) => (
              <li key={item.product.id} className="text-[13px]">
                <p className="text-ink">{item.product.name}</p>
                <p className="text-muted">{item.product.seller}</p>
                <p className="pt-1 font-semibold text-wine">
                  {formatEgp(item.product.priceValue)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t-[0.8px] border-line pt-4 text-[14px] font-semibold">
            <span>Total</span>
            <span>{formatEgp(cartTotal)}</span>
          </div>
          <p className="pt-3 text-[12px] leading-[18px] text-muted">
            One order is created per piece, so each seller confirms their own handover.
          </p>
        </aside>
      </section>
    </>
  );
}
