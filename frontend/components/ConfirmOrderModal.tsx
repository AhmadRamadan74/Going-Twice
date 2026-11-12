"use client";

import Image from "next/image";
import { useEffect } from "react";
import { formatEgp } from "@/lib/commerce";

export type ConfirmOrderPreview = {
  title: string;
  image: string;
  partyLabel: string;
  price: number;
};

export default function ConfirmOrderModal({
  role,
  preview,
  pending,
  onCancel,
  onConfirm,
}: {
  role: "buyer" | "seller";
  preview: ConfirmOrderPreview;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const buyer = role === "buyer";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(59,42,36,0.4)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-order-title"
        className="w-full max-w-[480px] rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.15)] bg-white p-8 shadow-[0_20px_25px_rgba(0,0,0,0.1)]"
      >
        <h2
          id="confirm-order-title"
          className="font-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-[28px]"
        >
          {buyer ? "Confirm You Received the Item" : "Confirm You Handed Over the Item"}
        </h2>
        <p className="pt-3 text-[14px] leading-[23px] text-muted">
          {buyer
            ? "Please confirm that the item has been received from the seller. This action cannot be undone."
            : "Please confirm that you have handed the item to the buyer. This action cannot be undone."}
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.15)] bg-[#f2e8d6] p-4">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
            {preview.image ? (
              <Image src={preview.image} alt={preview.title} fill sizes="56px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-display text-[16px] leading-6 text-ink">{preview.title}</p>
            <p className="pt-0.5 text-[12px] leading-[18px] text-muted">{preview.partyLabel}</p>
            <p className="pt-1 text-[12px] font-medium text-wine">{formatEgp(preview.price)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-[2px] bg-wine py-3.5 text-[15px] font-medium text-white disabled:opacity-60"
          >
            {pending ? "Confirming…" : "Yes, Confirm"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-[2px] border-[0.8px] border-wine py-3.5 text-[15px] font-medium text-wine"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
