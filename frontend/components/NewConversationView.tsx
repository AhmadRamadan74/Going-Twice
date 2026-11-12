"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, messagingService } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function NewConversationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const productId = Number(searchParams.get("product") || 0);
  const productName = searchParams.get("name") || "";
  const productImage = searchParams.get("image") || "";
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      const next = `/messages/new?product=${productId}&name=${encodeURIComponent(productName)}&image=${encodeURIComponent(productImage)}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, user, router, productId, productName, productImage]);

  if (!productId) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        No listing was specified.{" "}
        <Link href="/shop" className="text-wine">
          Browse the Collection
        </Link>
      </section>
    );
  }

  if (!ready || !user) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading…
      </section>
    );
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const conversation = await messagingService.startConversation(productId, body);
      window.dispatchEvent(new Event("messages-changed"));
      router.replace(`/messages/${conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message.");
      setSending(false);
    }
  }

  return (
    <section className="container-page py-6 sm:py-8">
      <Link href="/messages" className="text-[13px] text-muted hover:text-ink">
        ← Back to messages
      </Link>

      <div className="mx-auto mt-3 flex h-[calc(100vh-220px)] min-h-[560px] max-w-[760px] flex-col overflow-hidden rounded-[10px] border-[0.8px] border-[rgba(107,90,74,0.2)] bg-white shadow-[0_1px_3px_rgba(54,31,28,0.06)]">
        <div className="flex shrink-0 items-center gap-3 border-b-[0.8px] border-line bg-white px-4 py-3">
          {productImage && (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
              <Image src={productImage} alt="" fill sizes="40px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-ink">New message</p>
            <p className="truncate text-[12px] text-muted">{productName || "This listing"}</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#fafaf9] px-4 py-4 text-center">
          <p className="text-[13px] text-muted">
            Say hello — ask about condition, price, or arrange a viewing.
          </p>
        </div>

        {error && <p className="shrink-0 bg-white px-4 pt-2 text-[13px] text-wine">{error}</p>}

        <form
          onSubmit={onSend}
          className="flex shrink-0 items-center gap-2 border-t-[0.8px] border-line bg-white px-3 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="Hi, is this still available?"
            className="flex-1 rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/40 focus:border-ink"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
