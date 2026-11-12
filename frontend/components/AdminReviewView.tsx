"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  adminService,
  ApiError,
  type AdminDashboard,
  type AdminListingDto,
  type AdminListingStatus,
} from "@/lib/api";
import AdminOrdersPanel from "./AdminOrdersPanel";
import AdminCategoriesPanel from "./AdminCategoriesPanel";
import AdminMaterialsPanel from "./AdminMaterialsPanel";
import BrandLogo from "./BrandLogo";
import { useAuth } from "@/lib/auth-context";
import { formatEgp } from "@/lib/commerce";
import { mediaUrl } from "@/lib/media";
import {
  departments,
  getCategoryBySlug,
  type CategorySlug,
} from "@/lib/data";
import {
  CheckIcon,
  CloseIcon,
  DashboardIcon,
  ClockIcon,
  BoxIcon,
  DocumentIcon,
  TagIcon,
  SwatchIcon,
  MenuIcon,
  SignOutIcon,
  type IconProps,
} from "./icons";

/** The listing queues plus a marketplace-wide order log and taxonomy management. */
type AdminTab = AdminListingStatus | "overview" | "orders" | "categories" | "materials";

const TABS: { status: AdminTab; label: string; Icon: (props: IconProps) => React.ReactElement }[] = [
  { status: "overview", label: "Overview", Icon: DashboardIcon },
  { status: "pending_review", label: "Pending", Icon: ClockIcon },
  { status: "published", label: "Active", Icon: CheckIcon },
  { status: "rejected", label: "Rejected", Icon: CloseIcon },
  { status: "sold", label: "Sold", Icon: BoxIcon },
  { status: "orders", label: "Orders", Icon: DocumentIcon },
  { status: "categories", label: "Categories", Icon: TagIcon },
  { status: "materials", label: "Materials", Icon: SwatchIcon },
];

const NON_LISTING_TABS: AdminTab[] = ["overview", "orders", "categories", "materials"];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: "Pending",
    className: "border-[rgba(107,90,74,0.2)] bg-[#ede0cc] text-muted",
  },
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
  rejected: {
    label: "Rejected",
    className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.1)] text-wine",
  },
  sold: {
    label: "Sold",
    className: "border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.1)] text-wine",
  },
  draft: {
    label: "Draft",
    className: "border-[rgba(107,90,74,0.2)] bg-[#ede0cc] text-muted",
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
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function AdminReviewView() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stats, setStats] = useState<AdminDashboard | null>(null);
  const [listings, setListings] = useState<AdminListingDto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminService.dashboard());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load dashboard stats.");
    }
  }, []);

  const loadListings = useCallback(async (status: AdminListingStatus) => {
    setLoading(true);
    setError("");
    try {
      const page = await adminService.listings(status);
      setListings(page.items ?? []);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load listings for review.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/account");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    void loadStats();
  }, [user, loadStats]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    // Overview/Orders/Categories/Materials tabs don't use the listing queue.
    if (NON_LISTING_TABS.includes(tab)) {
      setLoading(false);
      return;
    }
    void loadListings(tab as AdminListingStatus);
  }, [user, tab, loadListings]);

  async function approve(id: number) {
    setPendingId(id);
    setError("");
    try {
      await adminService.approve(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_listings:
                tab === "pending_review"
                  ? Math.max(0, prev.pending_listings - 1)
                  : prev.pending_listings,
              rejected:
                tab === "rejected" ? Math.max(0, prev.rejected - 1) : prev.rejected,
              published: prev.published + 1,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this listing.");
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: number) {
    if (rejectReason.trim().length < 3) {
      setError("Please add a rejection reason (at least 3 characters).");
      return;
    }
    setPendingId(id);
    setError("");
    try {
      await adminService.reject(id, rejectReason.trim());
      setListings((prev) => prev.filter((item) => item.id !== id));
      setRejectingId(null);
      setRejectReason("");
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_listings: Math.max(0, prev.pending_listings - 1),
              published: tab === "published" ? Math.max(0, prev.published - 1) : prev.published,
              rejected: prev.rejected + 1,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject this listing.");
    } finally {
      setPendingId(null);
    }
  }

  if (!ready || !user || user.role !== "admin") {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading review queue…
      </section>
    );
  }

  function goTo(next: AdminTab) {
    setTab(next);
    setRejectingId(null);
    setRejectReason("");
  }

  const activeLabel = TABS.find((item) => item.status === tab)?.label ?? "Dashboard";

  async function signOut() {
    await logout();
    router.push("/");
  }

  function NavList({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {TABS.map((item) => {
          const active = tab === item.status;
          return (
            <button
              key={item.status}
              type="button"
              onClick={() => {
                goTo(item.status);
                onNavigate?.();
              }}
              className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                active ? "bg-wine text-white" : "text-cream/70 hover:bg-white/5 hover:text-cream"
              }`}
            >
              <item.Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.status === "pending_review" && stats && stats.pending_listings > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    active ? "bg-white/20 text-white" : "bg-white/10 text-cream/80"
                  }`}
                >
                  {stats.pending_listings}
                </span>
              ) : null}
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-parchment">
      {/* Desktop: permanent sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-ink md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-6">
          <BrandLogo href="/" variant="horizontal" tone="light" className="h-7" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <NavList />
        </nav>
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <p className="truncate text-[12px] font-medium text-cream/90">{user.full_name}</p>
          <p className="truncate text-[11px] text-cream/40">{user.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-medium text-cream/70 transition-colors hover:bg-white/5 hover:text-cream"
          >
            <SignOutIcon className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(107,90,74,0.15)] bg-white px-4 md:hidden">
          <BrandLogo href="/" variant="horizontal" tone="dark" className="h-6" />
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="grid size-9 place-items-center text-ink"
          >
            <MenuIcon className="size-[18px]" />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-ink/50"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-ink">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
                <BrandLogo href="/" variant="horizontal" tone="light" className="h-7" />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="grid size-8 place-items-center text-cream/70"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                <NavList onNavigate={() => setMobileNavOpen(false)} />
              </nav>
              <div className="shrink-0 border-t border-white/10 px-4 py-4">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-medium text-cream/70"
                >
                  <SignOutIcon className="size-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-10 md:py-10">
          <h1 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
            {activeLabel}
          </h1>
          <div className="mt-6">
          {error && <p className="pb-5 text-[13px] text-wine">{error}</p>}

          {tab === "overview" ? (
            stats ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Pending", stats.pending_listings],
                  ["Active", stats.published],
                  ["Rejected", stats.rejected],
                  ["Sold", stats.sold],
                  ["Orders", stats.orders],
                  ["Users", stats.users],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-4 py-4"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                      {label}
                    </p>
                    <p className="pt-1 font-display text-[28px] text-ink">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[14px] text-muted">Loading dashboard…</p>
            )
          ) : tab === "orders" ? (
        <AdminOrdersPanel />
      ) : tab === "categories" ? (
        <AdminCategoriesPanel />
      ) : tab === "materials" ? (
        <AdminMaterialsPanel />
      ) : loading ? (
        <p className="pt-10 text-center text-[14px] text-muted">Loading listings…</p>
      ) : listings.length === 0 ? (
        <div className="mt-10 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">Nothing in this queue</p>
          <p className="pt-2 text-[14px] text-muted">
            {tab === "pending_review"
              ? "New seller submissions will appear here for review."
              : "No listings with this status right now."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {listings.map((listing) => {
            const image = mediaUrl(listing.image_url || listing.images?.[0] || "");
            const status = STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending_review;
            const busy = pendingId === listing.id;
            const canApprove =
              listing.status === "pending_review" || listing.status === "rejected";
            const canReject =
              listing.status === "pending_review" || listing.status === "published";

            return (
              <li
                key={listing.id}
                className="rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc] sm:size-28">
                    {image ? (
                      <Image
                        src={image}
                        alt={listing.title}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-display text-[20px] leading-[1.2] text-ink">
                        {listing.title}
                      </h2>
                      <span
                        className={`shrink-0 rounded-[2px] border-[0.8px] px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    {listing.asking_price ? (
                      <p className="pt-1 text-[14px] font-medium text-wine">
                        {formatEgp(Number(listing.asking_price))}
                      </p>
                    ) : null}
                    <p className="pt-1 text-[12px] text-muted">{listingPath(listing.category)}</p>
                    {listing.seller && (
                      <p className="pt-2 text-[13px] text-ink/80">
                        Seller: {listing.seller.full_name}
                        {listing.seller.email ? ` · ${listing.seller.email}` : ""}
                      </p>
                    )}
                    {listing.description && (
                      <p className="mt-2 line-clamp-3 text-[13px] leading-[20px] text-muted">
                        {listing.description}
                      </p>
                    )}
                    {listing.rejection_reason && (
                      <p className="mt-2 text-[13px] text-wine">
                        Reason: {listing.rejection_reason}
                      </p>
                    )}

                    {(canApprove || canReject) && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {canApprove && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void approve(listing.id)}
                            className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
                          >
                            {busy && rejectingId !== listing.id ? "Approving…" : "Approve"}
                          </button>
                        )}
                        {canReject && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setRejectingId(
                                rejectingId === listing.id ? null : listing.id,
                              );
                              setRejectReason("");
                              setError("");
                            }}
                            className="rounded-[2px] border-[0.8px] border-wine px-5 py-2.5 text-[13px] font-medium text-wine disabled:opacity-60"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}

                    {rejectingId === listing.id && (
                      <div className="mt-4 space-y-3 border-t-[0.8px] border-line pt-4">
                        <label className="block">
                          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                            Rejection reason
                          </span>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Tell the seller what needs to change…"
                            className="mt-1.5 w-full rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                          />
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void reject(listing.id)}
                            className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
                          >
                            {busy ? "Rejecting…" : "Confirm reject"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="rounded-[2px] border-[0.8px] border-line px-5 py-2.5 text-[13px] font-medium text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
