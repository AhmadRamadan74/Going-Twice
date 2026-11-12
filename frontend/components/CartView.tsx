"use client";

import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import { CloseIcon } from "./icons";
import { useAuth } from "@/lib/auth-context";
import { formatEgp, useCommerce } from "@/lib/commerce";
import { buySellHref } from "@/lib/verified";

export default function CartView() {
  const { user } = useAuth();
  const { cart, cartTotal, removeFromCart, setDelivery, loading, busy, error } =
    useCommerce();

  const hasUnavailable = cart.some((item) => !item.available);

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Your Cart" }]} />
      <section className="container-page py-8 sm:py-12">
        <h1 className="border-b-[0.8px] border-line pb-4 font-display text-[36px] font-medium text-ink sm:text-[42px]">
          Your Cart
        </h1>

        {error && (
          <p className="mt-4 rounded-[2px] bg-wine/10 px-3 py-2 text-[13px] text-wine">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-[14px] text-muted">Loading your cart…</p>
        ) : cart.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-[28px] text-ink">Your cart is empty</p>
            <p className="pt-2 text-[14px] text-muted">
              Browse the collection to find your next piece.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-[2px] bg-wine px-6 py-3 text-[13px] font-medium text-white"
            >
              Shop the Collection
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 pt-8 lg:grid-cols-[1fr_320px]">
            <ul className="space-y-4">
              {cart.map((item) => (
                <li
                  key={item.product.id}
                  className={`relative rounded-[4px] border-[0.8px] border-line bg-white p-4 sm:p-5 ${
                    item.available ? "" : "opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Remove ${item.product.name}`}
                    disabled={busy}
                    onClick={() => void removeFromCart(item.product.id)}
                    className="absolute right-4 top-4 text-muted hover:text-ink disabled:opacity-50"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                  <div className="flex gap-4">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-[2px] bg-sand sm:size-28">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 pr-6">
                      <h2 className="font-display text-[18px] text-ink">
                        {item.product.name}
                      </h2>
                      <p className="pt-1 text-[13px] text-muted">{item.product.seller}</p>
                      <p className="pt-2 text-[14px] font-semibold text-wine">
                        {item.product.price}
                      </p>
                      {item.available ? (
                        <p className="pt-2 text-[12px] text-muted">
                          One of one — reserved for you until checkout.
                        </p>
                      ) : (
                        <p className="pt-2 text-[12px] font-medium text-wine">
                          No longer available — remove to continue.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t-[0.8px] border-line pt-3 text-[12px]">
                    <p className="text-muted">
                      {item.delivery === "pickup"
                        ? "Self Pickup — Free"
                        : "Shipping — Arranged by seller"}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setDelivery(
                          item.product.id,
                          item.delivery === "pickup" ? "shipping" : "pickup",
                        )
                      }
                      className="text-wine"
                    >
                      {item.delivery === "pickup"
                        ? "Change to Shipping"
                        : "Change to Pickup"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-[4px] border-[0.8px] border-line bg-white p-5 shadow-[0_2px_12px_rgba(59,42,36,0.06)]">
              <h2 className="font-display text-[22px] text-ink">Order Summary</h2>
              <ul className="mt-4 space-y-2 text-[13px] text-muted">
                {cart.map((item) => (
                  <li key={item.product.id} className="flex justify-between gap-3">
                    <span>{item.product.name}</span>
                    <span className="shrink-0 text-ink">
                      {item.available ? formatEgp(item.product.priceValue) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t-[0.8px] border-line pt-4 text-[14px] font-semibold text-ink">
                <span>Total</span>
                <span>{formatEgp(cartTotal)}</span>
              </div>
              {hasUnavailable ? (
                <p className="mt-4 rounded-[2px] bg-wine/10 px-3 py-2 text-[12px] text-wine">
                  Remove the unavailable pieces before checking out.
                </p>
              ) : (
                <>
                  {user && !user.email_verified && (
                    <p className="mt-4 rounded-[2px] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#bb4d00]">
                      Verify your email before you can place an order.
                    </p>
                  )}
                  <Link
                    href={buySellHref(user, "/checkout")}
                    className="mt-5 block rounded-[2px] bg-wine py-3 text-center text-[13px] font-medium text-white"
                  >
                    {user && !user.email_verified
                      ? "Verify Email to Checkout"
                      : "Proceed to Checkout"}
                  </Link>
                </>
              )}
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
