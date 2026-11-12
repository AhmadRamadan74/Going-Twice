"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/api";

export function verifyEmailPath(next = "/account") {
  return `/verify-email?next=${encodeURIComponent(next)}`;
}

function pathOnly(href: string) {
  return href.split("?")[0];
}

function isGatedPath(href: string) {
  const path = pathOnly(href);
  if (path === "/checkout") return true;
  return path === "/sell" || path.startsWith("/sell/");
}

export function continueAfterAuth(user: Pick<User, "email_verified">, next: string) {
  if (!user.email_verified && isGatedPath(next)) {
    return verifyEmailPath(next);
  }
  return next || "/account";
}

export function buySellHref(
  user: Pick<User, "email_verified"> | null,
  href: string,
) {
  if (!user) {
    return `/login?next=${encodeURIComponent(href)}`;
  }
  if (!user.email_verified) {
    return verifyEmailPath(href);
  }
  return href;
}

export function useRequireVerified(next: string) {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!user.email_verified) {
      router.replace(verifyEmailPath(next));
    }
  }, [ready, user, router, next]);

  return {
    user,
    ready,
    allowed: Boolean(ready && user?.email_verified),
  };
}
