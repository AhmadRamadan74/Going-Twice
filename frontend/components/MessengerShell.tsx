"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  type ConversationDto,
  type MessageDto,
  messagingService,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/media";

const POLL_MS = 4000; /// update the polling chat every 4 secodns
const LIST_POLL_MS = 15000;

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ConversationList({
  conversations,
  activeId,
  loading,
}: {
  conversations: ConversationDto[];
  activeId?: number;
  loading: boolean;
}) {
  if (loading) {
    return <p className="p-4 text-center text-[13px] text-muted">Loading…</p>;
  }
  if (conversations.length === 0) {
    return (
      <p className="p-4 text-center text-[13px] text-muted">
        No conversations yet. Message a seller from a listing page to start one.
      </p>
    );
  }
  return (
    <ul>
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              className={`flex items-center gap-3 border-b-[0.8px] border-[rgba(107,90,74,0.08)] px-4 py-3 transition-colors ${
                active ? "bg-cream" : "hover:bg-[#fafaf9]"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ede0cc] text-[12px] font-medium text-wine">
                {initials(conversation.other_party_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {conversation.other_party_name}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted">
                    {timeAgo(conversation.last_message_at)}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted">{conversation.product_name}</p>
                <p className="truncate pt-0.5 text-[12px] text-ink/80">
                  {conversation.last_message_preview}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-wine text-[10px] font-medium text-white">
                  {conversation.unread_count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function MessengerShell({ activeConversationId }: { activeConversationId?: number }) {
  const router = useRouter();
  const { user, ready } = useAuth();

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [activeConversation, setActiveConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [threadLoading, setThreadLoading] = useState(!!activeConversationId);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready && !user) {
      const next = activeConversationId ? `/messages/${activeConversationId}` : "/messages";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, user, router, activeConversationId]);

  // Conversation list, refreshed on mount and every LIST_POLL_MS.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = () => {
      messagingService
        .listConversations()
        .then((items) => {
          if (!cancelled) setConversations(items);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setListLoading(false);
        });
    };

    load();
    const interval = window.setInterval(load, LIST_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  // Active thread: initial load + short polling for new messages.
  useEffect(() => {
    if (!user || !activeConversationId) {
      setActiveConversation(null);
      setMessages([]);
      setThreadLoading(false);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    setNotFound(false);
    lastIdRef.current = 0;

    async function loadInitial() {
      try {
        const [conv, msgs] = await Promise.all([
          messagingService.getConversation(activeConversationId as number),
          messagingService.listMessages(activeConversationId as number),
        ]);
        if (cancelled) return;
        setActiveConversation(conv);
        setMessages(msgs);
        lastIdRef.current = msgs.length ? msgs[msgs.length - 1].id : 0;
        window.dispatchEvent(new Event("messages-changed"));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setNotFound(true);
        } else {
          setError("Could not load this conversation.");
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    }

    loadInitial();

    const interval = window.setInterval(async () => {
      try {
        const fresh = await messagingService.listMessages(
          activeConversationId as number,
          lastIdRef.current,
        );
        if (cancelled || fresh.length === 0) return;
        lastIdRef.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...prev, ...fresh]);
        window.dispatchEvent(new Event("messages-changed"));
      } catch {
        // Silent — the next tick tries again.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !activeConversationId) return;
    setSending(true);
    setError("");
    try {
      const sent = await messagingService.sendMessage(activeConversationId, body);
      setMessages((prev) => [...prev, sent]);
      lastIdRef.current = sent.id;
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  if (!ready || !user) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading…
      </section>
    );
  }

  return (
    <section className="container-page py-6 sm:py-8">
      <h1 className="pb-4 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
        Messages
      </h1>

      <div className="flex h-[calc(100vh-220px)] min-h-[560px] overflow-hidden rounded-[10px] border-[0.8px] border-[rgba(107,90,74,0.2)] bg-white shadow-[0_1px_3px_rgba(54,31,28,0.06)]">
        {/* Conversation list */}
        <aside
          className={`w-full shrink-0 overflow-y-auto border-line sm:w-[340px] sm:border-r-[0.8px] ${
            activeConversationId ? "hidden sm:block" : "block"
          }`}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            loading={listLoading}
          />
        </aside>

        {/* Active thread */}
        <div
          className={`flex min-w-0 flex-1 flex-col ${
            activeConversationId ? "flex" : "hidden sm:flex"
          }`}
        >
          {!activeConversationId ? (
            <div className="flex flex-1 items-center justify-center bg-[#fafaf9] text-center">
              <p className="px-6 text-[13px] text-muted">
                Select a conversation to see the messages.
              </p>
            </div>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[13px] text-muted">Loading…</p>
            </div>
          ) : notFound ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <p className="px-6 text-[13px] text-muted">
                This conversation is not available.
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b-[0.8px] border-line px-4 py-3">
                <Link
                  href="/messages"
                  className="text-[13px] text-muted hover:text-ink sm:hidden"
                >
                  ←
                </Link>
                {activeConversation?.product_image && (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-[4px] bg-[#ede0cc]">
                    <Image
                      src={mediaUrl(activeConversation.product_image)}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {activeConversation?.other_party_name}
                  </p>
                  {activeConversation?.product_slug ? (
                    <Link
                      href={`/product/${activeConversation.product_slug}`}
                      className="truncate text-[12px] text-muted hover:text-wine"
                    >
                      {activeConversation.product_name}
                    </Link>
                  ) : (
                    <p className="truncate text-[12px] text-muted">
                      {activeConversation?.product_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafaf9] px-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-[10px] px-4 py-2.5 text-[14px] leading-[21px] ${
                        message.is_mine
                          ? "bg-wine text-white"
                          : "border-[0.8px] border-line bg-white text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`pt-1 text-right text-[10px] ${
                          message.is_mine ? "text-white/70" : "text-muted"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {error && <p className="shrink-0 bg-white px-4 pt-2 text-[13px] text-wine">{error}</p>}

              <form
                onSubmit={onSend}
                className="flex shrink-0 items-center gap-2 border-t-[0.8px] border-line bg-white px-3 py-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/40 focus:border-ink"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="shrink-0 rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
