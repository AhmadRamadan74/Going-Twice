"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { departments, type DepartmentSlug } from "@/lib/data";
import {
  extrasFromUser,
  extrasHavePayout,
  formatPickupAddress,
  loadAccountExtras,
  paymentMethodsFromExtras,
} from "@/lib/account-settings";
import {
  ApiError,
  categoriesService,
  materialsService,
  sellService,
  type CategoryDto,
  type MaterialDto,
  type SellListingDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { verifyEmailPath } from "@/lib/verified";
import { PlusIcon, UploadIcon } from "./icons";

const fieldClass =
  "mt-1.5 w-full rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-4 py-[10px] text-[15px] leading-[22.5px] text-ink outline-none placeholder:text-ink/40 focus:border-ink";

const sandFieldClass =
  "mt-1.5 w-full rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.4)] bg-cream px-3 py-[10px] text-[15px] text-ink outline-none placeholder:text-ink/40 focus:border-ink";

const cardClass =
  "w-full rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-6 sm:p-8";

const CONDITIONS = ["Good Condition", "Lightly Used", "Vintage", "Recycled"] as const;

const COLOURS = [
  { name: "Walnut", hex: "#8b7355" },
  { name: "Espresso", hex: "#3b2a24" },
  { name: "Sage", hex: "#a8b59a" },
  { name: "Wine", hex: "#6b3d4b" },
  { name: "Gold", hex: "#daa520" },
  { name: "Teal", hex: "#2f4f4f" },
  { name: "Sand", hex: "#deb887" },
  { name: "Burgundy", hex: "#8b3a3a" },
  { name: "Sky", hex: "#87ceeb" },
  { name: "Ivory", hex: "#ffffff" },
];

const PHOTO_TIPS = [
  {
    src: "/images/guidelines/setup-backdrop.png",
    alt: "Camera on a tripod facing a small table against a plain white backdrop",
  },
  {
    src: "/images/guidelines/setup-lighting.png",
    alt: "Soft light angled onto a wooden dresser against a plain backdrop",
  },
  {
    src: "/images/guidelines/setup-prep.png",
    alt: "Wiping down a stool before photographing it against a white backdrop",
  },
];

const PHOTO_TIPS_DISMISSED_KEY = "gt_sell_photo_tips_dismissed";

const IMAGE_SLOTS = [
  { key: 0, label: "Main Image", hint: "Drop or click to upload", main: true },
  { key: 1, label: "Detail 1" },
  { key: 2, label: "Detail 2" },
  { key: 3, label: "Detail 3" },
  { key: 4, label: "Detail 4" },
  { key: 5, label: "Detail 5" },
  { key: 6, label: "Detail 6" },
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EMPTY_DEFAULTS = {
  title: "",
  brand: "",
  description: "",
  price: "",
  height: "",
  length: "",
  width: "",
  weight: "",
};

function departmentFromListing(listing: SellListingDto): DepartmentSlug {
  const dept = listing.department?.trim().toLowerCase();
  if (dept && departments.some((item) => item.slug === dept)) {
    return dept as DepartmentSlug;
  }
  const category = listing.category;
  const found = departments.find(
    (item) =>
      item.slug === category ||
      item.shopFilters?.some((filter) => filter.slug === category),
  );
  return (found?.slug ?? departments[0].slug) as DepartmentSlug;
}

function splitListingBody(description?: string | null) {
  const text = (description || "").trim();
  const match = text.match(/\n\n((?:Brand|Material|Colour):[\s\S]*)$/);
  if (!match || match.index === undefined) {
    return { body: text, brand: "", colour: "" };
  }
  const notes = match[1];
  return {
    body: text.slice(0, match.index).trim(),
    brand: notes.match(/Brand:\s*([^.\n]+)/)?.[1]?.trim() ?? "",
    colour: notes.match(/Colour:\s*([^.\n]+)/)?.[1]?.trim() ?? "",
  };
}

function parseDimensions(raw?: string | null) {
  const value = raw || "";
  return {
    height: value.match(/H\s+([\d.]+)/i)?.[1] ?? "",
    length: value.match(/L\s+([\d.]+)/i)?.[1] ?? "",
    width: value.match(/W\s+([\d.]+)/i)?.[1] ?? "",
    weight: value.match(/([\d.]+)\s*kg/i)?.[1] ?? "",
  };
}

function padSlots<T>(values: T[], fill: T): T[] {
  const next = values.slice(0, 7);
  while (next.length < 7) next.push(fill);
  return next;
}

function sellerExtras(user: User) {
  const fromServer = extrasFromUser(user);
  if (extrasHavePayout(fromServer)) return fromServer;
  return loadAccountExtras(user.id);
}

export default function SellForm({ listingId }: { listingId?: number }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const nextPath = listingId ? `/sell/${listingId}/edit` : "/sell";
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [showPhotoTips, setShowPhotoTips] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(PHOTO_TIPS_DISMISSED_KEY) === "1") {
        setShowPhotoTips(false);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — leave tips visible.
    }
  }, []);

  function dismissPhotoTips() {
    setShowPhotoTips(false);
    try {
      localStorage.setItem(PHOTO_TIPS_DISMISSED_KEY, "1");
    } catch {
      // Best-effort only.
    }
  }

  function revealPhotoTips() {
    setShowPhotoTips(true);
    try {
      localStorage.removeItem(PHOTO_TIPS_DISMISSED_KEY);
    } catch {
      // Best-effort only.
    }
  }
  const [certified, setCertified] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "missing">(
    listingId ? "loading" : "ready",
  );
  const [listingStatus, setListingStatus] = useState("draft");
  const [rejectionReason, setRejectionReason] = useState("");
  const [formKey, setFormKey] = useState("new");
  const [defaults, setDefaults] = useState(EMPTY_DEFAULTS);
  const [existingUrls, setExistingUrls] = useState<(string | null)[]>(Array(7).fill(null));

  const [department, setDepartment] = useState<DepartmentSlug>(departments[0].slug);
  const subcategories = useMemo(() => {
    const dept = departments.find((item) => item.slug === department);
    return (dept?.shopFilters ?? []).filter((item) => item.slug !== "all");
  }, [department]);
  const [category, setCategory] = useState(subcategories[0]?.slug ?? "chairs");

  useEffect(() => {
    if (!subcategories.some((item) => item.slug === category)) {
      setCategory(subcategories[0]?.slug ?? "chairs");
    }
  }, [category, subcategories]);

  const [catalogSubcategories, setCatalogSubcategories] = useState<CategoryDto[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<MaterialDto[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");
  const [materialId, setMaterialId] = useState<number | "">("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([categoriesService.list(), materialsService.list()])
      .then(([cats, mats]) => {
        if (cancelled) return;
        setCatalogSubcategories(cats.filter((c) => c.parent_id != null));
        setCatalogMaterials(mats);
      })
      .catch(() => {
        // Non-critical — these are optional extra classifiers.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [conditions, setConditions] = useState<string[]>([]);
  const [colour, setColour] = useState(COLOURS[0].name);
  const [previews, setPreviews] = useState<(string | null)[]>(Array(7).fill(null));
  const [files, setFiles] = useState<(File | null)[]>(Array(7).fill(null));
  const [pickup, setPickup] = useState("");

  const [mainPhotoProcessing, setMainPhotoProcessing] = useState(false);
  const [mainPhotoAutoApplied, setMainPhotoAutoApplied] = useState(false);
  const mainPhotoRequestId = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    if (!listingId && !user.email_verified) {
      router.replace(verifyEmailPath("/sell"));
    }
  }, [ready, user, router, listingId, nextPath]);

  useEffect(() => {
    if (!user || listingId) return;
    const extras = sellerExtras(user);
    const line = formatPickupAddress(extras.address);
    if (line) setPickup(line);
  }, [user, listingId]);

  useEffect(() => {
    if (!listingId || !user) return;
    let cancelled = false;
    sellService
      .get(listingId)
      .then((listing) => {
        if (cancelled) return;
        const editable = ["draft", "rejected", "pending_review"].includes(listing.status);
        if (!editable) {
          setLoadState("missing");
          setError("This listing can no longer be edited.");
          return;
        }
        const parsed = splitListingBody(listing.description);
        const dims = parseDimensions(listing.dimensions);
        const images = (listing.images?.length
          ? listing.images
          : listing.image_url
            ? [listing.image_url]
            : []
        ).filter(Boolean);
        setListingStatus(listing.status);
        setRejectionReason(listing.rejection_reason || "");
        setDepartment(departmentFromListing(listing));
        setCategory(listing.category || "chairs");
        setConditions(
          (listing.condition || "")
            .split(",")
            .map((item) => item.trim())
            .filter((item) => CONDITIONS.includes(item as (typeof CONDITIONS)[number])),
        );
        const colourName = COLOURS.find((item) => item.name === parsed.colour)?.name;
        if (colourName) setColour(colourName);
        setSubcategoryId(listing.subcategory_id ?? "");
        setMaterialId(listing.material_id ?? "");
        setExistingUrls(padSlots(images, null));
        setFiles(Array(7).fill(null));
        setPreviews(padSlots(images.map((src) => mediaUrl(src)), null));
        setPickup(listing.location_city || "");
        setDefaults({
          title: listing.title || "",
          brand: parsed.brand || listing.era || "",
          description: parsed.body,
          price:
            listing.asking_price != null && Number(listing.asking_price) > 0
              ? String(Number(listing.asking_price))
              : "",
          height: dims.height,
          length: dims.length,
          width: dims.width,
          weight: dims.weight,
        });
        setFormKey(`edit-${listing.id}-${listing.updated_at || listing.created_at}`);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState("missing");
        setError(err instanceof ApiError ? err.message : "Could not load this listing.");
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, user]);

  function onFiles(slot: number, list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Each image must be 8 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(file);
    setError("");
    setPreviews((prev) => {
      const next = [...prev];
      if (next[slot]?.startsWith("blob:")) URL.revokeObjectURL(next[slot] as string);
      next[slot] = url;
      return next;
    });
    setFiles((prev) => {
      const next = [...prev];
      next[slot] = file;
      return next;
    });
    setExistingUrls((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });

    if (slot === 0) {
      setMainPhotoAutoApplied(false);
      void processMainPhoto(file);
    }
  }

  async function processMainPhoto(file: File) {
    const requestId = ++mainPhotoRequestId.current;
    setMainPhotoProcessing(true);
    try {
      const result = await sellService.processMainPhoto(file);
      // A newer upload may have started (and finished) while this one was
      // in flight — never let a slow, stale response overwrite it.
      if (mainPhotoRequestId.current !== requestId) return;
      if (result.white_bg_url) {
        const url = result.white_bg_url;
        setPreviews((prev) => {
          const next = [...prev];
          if (next[0]?.startsWith("blob:")) URL.revokeObjectURL(next[0] as string);
          next[0] = mediaUrl(url);
          return next;
        });
        setFiles((prev) => {
          const next = [...prev];
          next[0] = null;
          return next;
        });
        setExistingUrls((prev) => {
          const next = [...prev];
          next[0] = url;
          return next;
        });
        setMainPhotoAutoApplied(true);
      }
    } catch {
      // Best-effort enhancement — the seller can still publish with the
      // original photo, so this stays silent rather than blocking them.
    } finally {
      if (mainPhotoRequestId.current === requestId) {
        setMainPhotoProcessing(false);
      }
    }
  }

  function clearSlot(slot: number) {
    setPreviews((prev) => {
      const next = [...prev];
      if (next[slot]?.startsWith("blob:")) URL.revokeObjectURL(next[slot] as string);
      next[slot] = null;
      return next;
    });
    setFiles((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
    setExistingUrls((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
    if (slot === 0) {
      mainPhotoRequestId.current += 1;
      setMainPhotoAutoApplied(false);
      setMainPhotoProcessing(false);
    }
  }

  async function submit(asDraft: boolean) {
    if (!user) return;
    setError("");
    if (!asDraft && !certified) {
      setError("Please certify that you own this piece, or have permission to sell it.");
      return;
    }
    if (!asDraft && !previews[0]) {
      setError("A main image is required to publish.");
      return;
    }

    const form = document.getElementById("list-piece-form") as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const description = String(data.get("description") || "").trim();
    const brand = String(data.get("brand") || "").trim();
    const price = Number(data.get("price"));
    const height = String(data.get("height") || "").trim();
    const length = String(data.get("length") || "").trim();
    const width = String(data.get("width") || "").trim();
    const weight = String(data.get("weight") || "").trim();

    if (!title) {
      setError("Please add a title.");
      return;
    }

    const extras = sellerExtras(user);
    const paymentMethods = paymentMethodsFromExtras(extras);

    const dimParts = [
      height && height !== "0" ? `H ${height}` : "",
      length && length !== "0" ? `L ${length}` : "",
      width && width !== "0" ? `W ${width}` : "",
    ].filter(Boolean);
    const dimensions = [
      dimParts.length ? `${dimParts.join(" × ")} cm` : "",
      weight && weight !== "0" ? `${weight} kg` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const notes = [brand && `Brand: ${brand}`, colour && `Colour: ${colour}`]
      .filter(Boolean)
      .join(". ");

    let body = description;
    if (notes) body = body ? `${body}\n\n${notes}` : notes;
    if (body.length < 10) {
      body = asDraft ? `${body} Draft listing pending details.`.trim() : body;
    }
    if (!asDraft && body.length < 10) {
      setError("Please add a short description of the piece.");
      return;
    }

    const selected = files.filter((file): file is File => file !== null);
    const mergedImages: string[] = [];
    const asking = Number.isFinite(price) && price > 0 ? price : asDraft ? 1 : 0;
    if (!asDraft && asking <= 0) {
      setError("Please set a price.");
      return;
    }
    if (!asDraft && !user.email_verified) {
      router.push(verifyEmailPath(nextPath));
      return;
    }

    setPending(asDraft ? "draft" : "publish");
    try {
      const uploaded = selected.length ? await sellService.uploadImages(selected) : [];
      let uploadIndex = 0;
      for (let i = 0; i < 7; i += 1) {
        if (files[i]) mergedImages.push(uploaded[uploadIndex++]);
        else if (existingUrls[i]) mergedImages.push(existingUrls[i] as string);
      }
      if (!asDraft && mergedImages.length === 0) {
        setError("A main image is required to publish.");
        setPending(null);
        return;
      }

      const payload = {
        title,
        description: body.length >= 10 ? body : "Draft listing pending details.",
        asking_price: asking,
        category,
        department,
        subcategory_id: subcategoryId === "" ? undefined : subcategoryId,
        material_id: materialId === "" ? undefined : materialId,
        dimensions: dimensions || undefined,
        era: brand || undefined,
        condition: conditions.join(", ") || undefined,
        city: pickup || extras.address.city || undefined,
        payment_methods: paymentMethods,
        ...(mergedImages.length
          ? { image_url: mergedImages[0], image_urls: mergedImages }
          : {}),
      };

      if (listingId) {
        await sellService.update(listingId, payload);
        if (!asDraft && listingStatus !== "pending_review") {
          await sellService.resubmit(listingId);
        }
        router.push(
          asDraft || listingStatus === "pending_review"
            ? "/account/uploads"
            : "/sell/published",
        );
      } else {
        await sellService.listPiece({
          ...payload,
          seller_name: user.full_name,
          seller_email: user.email,
          seller_phone: user.phone_number || "0000000000",
          save_as_draft: asDraft,
        });
        router.push(asDraft ? "/account/uploads" : "/sell/published");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your listing.");
    } finally {
      setPending(null);
    }
  }

  const allowed = Boolean(ready && user && (listingId || user.email_verified));

  if (!ready || !user || !allowed || loadState === "loading") {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading listing form…
      </section>
    );
  }

  if (listingId && loadState === "missing") {
    return (
      <section className="container-page py-16 text-center">
        <p className="font-display text-[28px] text-ink">This listing cannot be edited</p>
        <p className="pt-2 text-[14px] text-muted">{error || "Open it from My Uploads instead."}</p>
        <Link
          href="/account/uploads"
          className="mt-6 inline-block text-[14px] font-medium text-wine"
        >
          Back to My Uploads
        </Link>
      </section>
    );
  }

  const isEdit = Boolean(listingId);
  const submitLabel =
    listingStatus === "rejected"
      ? "Resubmit for Review"
      : listingStatus === "pending_review"
        ? "Save Changes"
        : isEdit
          ? "Submit for Review"
          : "Publish Listing";
  const draftLabel = listingStatus === "pending_review" ? "Save Changes" : "Save as Draft";

  return (
    <section className="mx-auto max-w-[860px] px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-display text-[40px] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[48px]">
        {isEdit ? "Edit Listing" : "List a New Piece"}
      </h1>
      {isEdit ? (
        <Link href="/account/uploads" className="mt-3 inline-block text-[13px] font-medium text-wine">
          Back to My Uploads
        </Link>
      ) : null}
      <div className="mt-2 h-px w-full bg-[rgba(107,90,74,0.2)]" />

      {rejectionReason ? (
        <p className="mt-6 rounded-[6px] border-[0.8px] border-[#fee685] bg-[#fffbeb] px-4 py-3 text-[13px] leading-[19.5px] text-[#bb4d00]">
          Reviewer note: {rejectionReason}
        </p>
      ) : null}

      {error && <p className="pt-6 text-[13px] text-wine">{error}</p>}

      <form
        id="list-piece-form"
        key={formKey}
        className="mt-10 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <div className={cardClass}>
          <h2 className="font-display text-[22px] font-medium text-ink">Basic Information</h2>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Title
              </span>
              <input
                name="title"
                required
                defaultValue={defaults.title}
                placeholder="e.g. Mid-Century Teak Sideboard"
                className={fieldClass}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Category
                </span>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentSlug)}
                  className={fieldClass}
                >
                  {departments.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Sub-Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={fieldClass}
                >
                  {subcategories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {catalogSubcategories.length > 0 && (
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Detailed Subcategory (optional)
                </span>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : "")}
                  className={fieldClass}
                >
                  <option value="">— None —</option>
                  {catalogSubcategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Brand (optional)
              </span>
              <input
                name="brand"
                defaultValue={defaults.brand}
                placeholder="e.g. Unknown, Danish Craft"
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-medium text-ink">Upload Images</h2>
            <div className="flex items-center gap-4">
              {!showPhotoTips && (
                <button
                  type="button"
                  onClick={revealPhotoTips}
                  className="text-[12px] font-medium text-wine underline underline-offset-2"
                >
                  Show tips
                </button>
              )}
              <button
                type="button"
                onClick={() => setGuidelinesOpen(true)}
                className="text-[12px] font-medium text-wine underline underline-offset-2"
              >
                See Guidelines
              </button>
            </div>
          </div>

          {showPhotoTips && (
            <div className="mt-5 rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.15)] bg-cream/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] leading-[19.5px] text-ink/80">
                  A simple, plain background and soft natural light go a long way. Shoot the
                  whole piece first, then a couple of close-up details.
                </p>
                <button
                  type="button"
                  onClick={dismissPhotoTips}
                  className="shrink-0 text-[11px] font-medium text-muted underline underline-offset-2 hover:text-ink"
                >
                  Hide tips
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {PHOTO_TIPS.map((tip) => (
                  <div
                    key={tip.src}
                    className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-[#ede0cc]"
                  >
                    <Image
                      src={tip.src}
                      alt={tip.alt}
                      fill
                      sizes="(min-width: 640px) 200px, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {IMAGE_SLOTS.map((slot) => (
              <ImageSlot
                key={slot.key}
                slot={slot}
                preview={previews[slot.key]}
                onFiles={(files) => onFiles(slot.key, files)}
                onClear={() => clearSlot(slot.key)}
                busy={slot.key === 0 && mainPhotoProcessing}
              />
            ))}
          </div>

          {mainPhotoAutoApplied && (
            <p className="mt-3 text-[12px] text-muted">
              ✓ Background replaced with white automatically. Not happy with it? Click the
              main photo to upload a different one.
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="font-display text-[22px] font-medium text-ink">Dimensions</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["height", "Height (cm)"],
              ["length", "Length (cm)"],
              ["width", "Width (cm)"],
              ["weight", "Weight (kg)"],
            ].map(([name, label]) => (
              <label key={name} className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  {label}
                </span>
                <input
                  name={name}
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={defaults[name as keyof typeof defaults]}
                  className={sandFieldClass}
                />
              </label>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="font-display text-[22px] font-medium text-ink">Details</h2>
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Condition (select all that apply)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONDITIONS.map((item) => {
                  const active = conditions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setConditions((prev) =>
                          prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
                        )
                      }
                      className={`rounded-[2px] border-[0.8px] px-4 py-2 text-[13px] font-medium ${
                        active
                          ? "border-wine bg-wine text-white"
                          : "border-[rgba(107,90,74,0.3)] text-muted"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Colour</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLOURS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    aria-label={item.name}
                    onClick={() => setColour(item.name)}
                    className={`size-8 rounded-full border-[1.6px] ${
                      colour === item.name ? "border-wine" : "border-transparent"
                    } ${item.name === "Ivory" ? "shadow-[inset_0_0_0_1px_#ccc]" : ""}`}
                    style={{ backgroundColor: item.hex }}
                  />
                ))}
              </div>
            </div>
            {catalogMaterials.length > 0 && (
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Material (optional)
                </span>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value ? Number(e.target.value) : "")}
                  className={`${fieldClass} sm:max-w-[280px]`}
                >
                  <option value="">— None —</option>
                  {catalogMaterials.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="font-display text-[22px] font-medium text-ink">Description & Pricing</h2>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Description
              </span>
              <textarea
                name="description"
                rows={5}
                defaultValue={defaults.description}
                placeholder="Describe the piece — its history, notable features, condition details..."
                className={`${fieldClass} min-h-[134px] resize-y`}
              />
            </label>
            <label className="relative block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Price (EGP)
              </span>
              <span className="pointer-events-none absolute left-4 top-[38px] text-[14px] text-muted">
                EGP
              </span>
              <input
                name="price"
                type="number"
                min="0"
                placeholder="0"
                defaultValue={defaults.price}
                className={`${sandFieldClass} pl-14`}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Pickup Address
              </span>
              <input
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="26 El Gezira St, Zamalek, Cairo"
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-5">
          <input
            type="checkbox"
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded-[2px] border-[0.8px] border-[rgba(107,90,74,0.4)] accent-wine"
          />
          <span className="text-[14px] leading-[22.75px] text-ink">
            I certify that all information provided is accurate and that I am the owner of this item
            or have permission to sell it.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          {listingStatus !== "pending_review" && (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void submit(true)}
              className="rounded-[2px] border-[0.8px] border-wine px-7 py-3.5 text-[15px] font-medium text-wine disabled:opacity-60"
            >
              {pending === "draft" ? "Saving…" : draftLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={pending !== null}
            className={`rounded-[2px] bg-wine px-7 py-3.5 text-[15px] font-medium text-white disabled:opacity-60 ${
              listingStatus === "pending_review" ? "sm:col-span-2" : ""
            }`}
          >
            {pending === "publish" ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>

      {guidelinesOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
          onClick={() => setGuidelinesOpen(false)}
        >
          <div
            className="max-w-[420px] rounded-[8px] bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[22px] text-ink">Photo guidelines</h3>
            <ul className="mt-4 space-y-2 text-[14px] leading-[22px] text-muted">
              <li>Use natural light and a clean, uncluttered background.</li>
              <li>Show the full piece first, then details, marks, and any wear.</li>
              <li>Upload up to seven photos — the first becomes the main listing image.</li>
            </ul>
            <button
              type="button"
              onClick={() => setGuidelinesOpen(false)}
              className="mt-6 rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ImageSlot({
  slot,
  preview,
  onFiles,
  onClear,
  busy,
}: {
  slot: (typeof IMAGE_SLOTS)[number];
  preview: string | null;
  onFiles: (files: FileList | null) => void;
  onClear?: () => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[6px] border-dashed bg-cream ${
        slot.main
          ? "col-span-2 min-h-[220px] border-[1.6px] border-[rgba(107,90,74,0.3)] sm:min-h-[280px]"
          : slot.key <= 2
            ? "min-h-[220px] border-[1.6px] border-[rgba(107,90,74,0.2)] sm:min-h-[280px]"
            : "min-h-[120px] border-[1.6px] border-[rgba(107,90,74,0.2)] sm:min-h-[160px]"
      }`}
    >
      {busy && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-ink/60 text-white">
          <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="text-[11px] font-medium">Processing…</span>
        </div>
      )}
      {preview && onClear ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove image"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }
          }}
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-ink/70 text-[16px] leading-none text-white"
        >
          ×
        </span>
      ) : null}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
      ) : slot.main ? (
        <>
          <UploadIcon className="size-6 text-muted" />
          <p className="pt-2 text-[13px] font-medium text-muted">{slot.label}</p>
          <p className="text-[11px] text-muted/80">{slot.hint}</p>
        </>
      ) : (
        <>
          <PlusIcon className="size-4 text-muted/70" />
          <p className="pt-1 text-[10px] font-medium text-muted/70">{slot.label}</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}
