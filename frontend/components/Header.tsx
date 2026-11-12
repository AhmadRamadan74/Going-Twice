"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { messagingService, notificationsService } from "@/lib/api";
import { navLinks } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { buySellHref } from "@/lib/verified";
import { useCommerce } from "@/lib/commerce";
import BrandLogo from "./BrandLogo";
import SearchForm from "./SearchForm";
import {
  BellIcon,
  CartIcon,
  ChatIcon,
  CloseIcon,
  DashboardIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "./icons";

function IconLink({
  href,
  label,
  children,
  badge = false,
  count,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  badge?: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex cursor-pointer flex-col items-center px-2 py-1.5 text-muted transition-colors hover:text-ink sm:px-3"
    >
      {children}
      <span className="hidden pt-0.5 text-[10px] font-medium leading-[15px] sm:block">
        {label}
      </span>
      {badge && !count && (
        <span className="absolute right-1.5 top-1 size-2 rounded-full bg-sage sm:right-2" />
      )}
      {!!count && (
        <span className="absolute right-1 top-0 grid min-w-4 place-items-center rounded-full bg-wine px-1 text-[9px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { cartCount } = useCommerce();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setAlertCount(0);
      return;
    }

    const load = () => {
      notificationsService
        .unreadCount()
        .then(setAlertCount)
        .catch(() => setAlertCount(0));
    };

    load();
    window.addEventListener("notifications-changed", load);
    return () => window.removeEventListener("notifications-changed", load);
  }, [user, pathname]);

  useEffect(() => {
    if (!user) {
      setMessageCount(0);
      return;
    }

    const load = () => {
      messagingService
        .unreadCount()
        .then(setMessageCount)
        .catch(() => setMessageCount(0));
    };

    load();
    window.addEventListener("messages-changed", load);
    const interval = window.setInterval(load, 25000);
    return () => {
      window.removeEventListener("messages-changed", load);
      window.clearInterval(interval);
    };
  }, [user, pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <header className="sticky top-0 z-50 bg-parchment/90 shadow-[0_1px_1.5px_rgba(54,31,28,0.08),0_1px_1px_rgba(54,31,28,0.06)] backdrop-blur-md">
      <div className="border-b-[0.8px] border-line">
        <div className="container-page flex h-14 items-center gap-2 sm:h-16 sm:gap-5">
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            onClick={() => {
              setMobileNavOpen((open) => !open);
              setMobileSearchOpen(false);
            }}
            className="grid size-9 shrink-0 place-items-center text-ink transition-colors hover:text-wine md:hidden"
          >
            {mobileNavOpen ? (
              <CloseIcon className="size-[18px]" />
            ) : (
              <MenuIcon className="size-[18px]" />
            )}
          </button>

          <BrandLogo href="/" variant="horizontal" className="pr-1 sm:pr-2" />

          <SearchForm />

          <div className="ml-auto flex items-center gap-0">
            <button
              type="button"
              aria-label="Open search"
              aria-expanded={mobileSearchOpen}
              onClick={() => {
                setMobileSearchOpen((open) => !open);
                setMobileNavOpen(false);
              }}
              className="grid size-9 place-items-center text-muted transition-colors hover:text-ink md:hidden"
            >
              <SearchIcon className="size-[18px]" />
            </button>

            {user?.role === "admin" && (
              <IconLink href="/admin" label="Dashboard">
                <DashboardIcon className="size-[18px]" />
              </IconLink>
            )}
            <IconLink href={user ? "/account" : "/login"} label="Account">
              <UserIcon className="size-[18px]" />
            </IconLink>
            <IconLink
              href={user ? "/messages" : "/login?next=/messages"}
              label="Messages"
              count={messageCount}
            >
              <ChatIcon className="size-[18px]" />
            </IconLink>
            <IconLink href={user ? "/alerts" : "/login?next=/alerts"} label="Alerts" count={alertCount}>
              <BellIcon className="size-[18px]" />
            </IconLink>
            <IconLink href="/cart" label="Cart" count={cartCount}>
              <CartIcon className="size-[18px]" />
            </IconLink>

            <Link
              href={user ? buySellHref(user, "/sell") : "/sell"}
              className="ml-1 rounded-[2px] bg-wine px-3 py-2 text-[11px] font-medium leading-[16px] text-white transition-opacity hover:opacity-90 sm:ml-3 sm:px-5 sm:py-2.5 sm:text-[12px] sm:leading-[18px]"
            >
              <span className="sm:hidden">Sell</span>
              <span className="hidden sm:inline">Sell a Piece</span>
            </Link>
          </div>
        </div>

        {mobileSearchOpen && <SearchForm compact />}
      </div>

      <nav
        id="mobile-nav"
        className={`border-b-[0.8px] border-line bg-parchment md:hidden ${
          mobileNavOpen ? "block" : "hidden"
        }`}
      >
        <div className="container-page flex flex-col py-2">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`border-l-2 py-3 pl-3 text-[14px] font-medium leading-[21px] transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden border-b-[0.8px] border-line bg-parchment/80 md:block">
        <div className="container-page flex h-[45.6px] items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex h-full shrink-0 items-center border-b-[1.6px] px-4 text-[13px] font-medium leading-[19.5px] transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
