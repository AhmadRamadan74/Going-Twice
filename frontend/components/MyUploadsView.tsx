"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, sellService, type SellListingDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatEgp } from "@/lib/commerce";
import { mediaUrl } from "@/lib/media";
import { buySellHref, verifyEmailPath } from "@/lib/verified";
import {
  departments,
  getCategoryBySlug,
  type CategorySlug,
} from "@/lib/data";
import { PlusIcon } from "./icons";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  published: {
    label: "Active",
    className:
      "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] text-[#3a6040]",
  },
  approved: {
    label: "Active",
    className:
      "border-[rgba(168,181,154,0.4)] bg-[rgba(168,181,154,0.2)] text-[#3a6040]",
  },
  draft: {
    label: "Draft",
    className: "border-[rgba(107,90,74,0.2)] bg-[#ede0cc] text-muted",
  },
  pending_review: {
    label: "Pending",
    className: "border-[rgba(107,90,74,0.2)] bg-[#ede0cc] text-muted",
  },
  sold: {
    label: "Sold",
    className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.1)] text-wine",
  },
  rejected: {
    label: "Rejected",
    className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.1)] text-wine",
  },
};

function prettySlug(slug?: string | null) {
  if (!slug) return "";
  const category = getCategoryBySlug(slug as CategorySlug);
  if (category) return category.name;
  for (const department of departments) {
    const filter = department.shopFilters?.find((item) => item.slug === slug);
    if (filter) return filter.label;
  }
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function listingPath(category?: string | null) {
  const categoryLabel = prettySlug(category);
  const department = departments.find(
    (item) =>
      item.slug === category ||
      item.shopFilters?.some((filter) => filter.slug === category),
  );
  if (department && categoryLabel && department.name !== categoryLabel) {
    return `${department.name} · ${categoryLabel}`;
  }
  return categoryLabel || department?.name || "Uncategorised";
}

function listingImage(listing: SellListingDto) {
  return mediaUrl(listing.image_url || listing.images?.[0] || "");
}

function statusMeta(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      label: status.replace(/_/g, " "),
      className: "border-line bg-sand text-muted",
    }
  );
}

export default function MyUploadsView() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [listings, setListings] = useState<SellListingDto[]>([]);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account/uploads");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    sellService
      .mine()
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load your listings."));
  }, [user]);

  async function runAction(
    id: number,
    action: (listingId: number) => Promise<SellListingDto>,
    failure: string,
  ) {
    setPendingId(id);
    setError("");
    try {
      const next = await action(id);
      setListings((prev) => prev.map((row) => (row.id === id ? next : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setPendingId(null);
    }
  }

  if (!ready || !user) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading listings…
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[36px] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[44px]">
          My Uploads
        </h1>
        <Link
          href={buySellHref(user, "/sell")}
          className="inline-flex items-center gap-2 rounded-[2px] bg-wine px-7 py-3.5 text-[15px] font-medium text-white"
        >
          <PlusIcon className="size-3.5" />
          New Listing
        </Link>
      </div>
      <div className="mt-3 h-px w-full bg-[rgba(107,90,74,0.2)]" />

      {error && <p className="pt-6 text-[13px] text-wine">{error}</p>}

      {listings.length === 0 ? (
        <div className="mt-10 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">No listings yet</p>
          <p className="mx-auto max-w-[380px] pt-2 text-[14px] text-muted">
            List a piece and it will appear here as a draft, pending, or live listing.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {listings.map((listing) => {
            const image = listingImage(listing);
            const status = statusMeta(listing.status);
            const href =
              listing.slug &&
              (listing.status === "published" || listing.status === "approved")
                ? `/product/${listing.slug}`
                : undefined;

            const card = (
              <article className="flex gap-4 overflow-hidden rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-4">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
                  {image ? (
                    <Image
                      src={image}
                      alt={listing.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-[17px] leading-[21px] text-ink">
                      {listing.title}
                    </h2>
                    <span
                      className={`shrink-0 rounded-[2px] border-[0.8px] px-2 py-0.5 text-[11px] font-medium leading-[16.5px] ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {listing.asking_price ? (
                    <p className="pt-1 text-[13px] font-medium leading-[19.5px] text-wine">
                      {formatEgp(Number(listing.asking_price))}
                    </p>
                  ) : null}
                  <p className="pt-1 text-[12px] leading-[18px] text-muted">
                    {listingPath(listing.category)}
                  </p>
                  {listing.rejection_reason ? (
                    <p className="pt-1.5 text-[12px] leading-[18px] text-wine">
                      {listing.rejection_reason}
                    </p>
                  ) : null}
                </div>
              </article>
            );

            const canResubmit =
              listing.status === "draft" || listing.status === "rejected";
            const canEdit =
              canResubmit || listing.status === "pending_review";
            const cardHref = href || (canEdit ? `/sell/${listing.id}/edit` : undefined);

            return (
              <li key={listing.id}>
                {cardHref ? (
                  <Link href={cardHref} className="block transition-opacity hover:opacity-90">
                    {card}
                  </Link>
                ) : (
                  card
                )}
                {(canEdit || canResubmit) && (
                  <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
                    {canEdit && (
                      <Link
                        href={`/sell/${listing.id}/edit`}
                        className="rounded-[2px] border-[0.8px] border-ink px-3 py-1.5 text-[12px] font-medium leading-[18px] text-ink"
                      >
                        Edit
                      </Link>
                    )}
                    {canResubmit && (
                      <button
                        type="button"
                        disabled={pendingId === listing.id}
                        onClick={() => {
                          if (!user.email_verified) {
                            router.push(verifyEmailPath("/account/uploads"));
                            return;
                          }
                          void runAction(
                            listing.id,
                            sellService.resubmit,
                            "Could not resubmit this listing.",
                          );
                        }}
                        className="rounded-[2px] bg-wine px-3 py-1.5 text-[12px] font-medium leading-[18px] text-white disabled:opacity-60"
                      >
                        {pendingId === listing.id ? "Working…" : "Submit for Review"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
