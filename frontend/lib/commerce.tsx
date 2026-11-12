"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, cartService, wishlistService } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/data";
import { mapProduct } from "@/lib/mappers";

export type Delivery = "pickup" | "shipping";

export type CartItem = {
  product: Product;
  /** Always 1 — every piece on Going Twice is one of one. */
  quantity: number;
  delivery: Delivery;
  available: boolean;
};

const CART_KEY = "gt_cart";
const WISHLIST_KEY = "gt_wishlist";
const DELIVERY_KEY = "gt_delivery";
/** Written by the old fully-local checkout. Cleared on first load. */
const LEGACY_ORDERS_KEY = "gt_orders";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the server copy is the real one anyway */
  }
}

function dropKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

type DeliveryMap = Record<string, Delivery>;

/**
 * Handover choice is a buyer intent rather than cart state: the backend stores
 * it per *order*, and one cart becomes one order per piece. We keep the choice
 * here until checkout, which sends it as `item_handover`.
 */
function readDeliveries(): DeliveryMap {
  return readJson<DeliveryMap>(DELIVERY_KEY, {});
}

type CommerceContextValue = {
  cart: CartItem[];
  wishlist: Product[];
  cartCount: number;
  cartTotal: number;
  /** True until the first cart/wishlist load settles. */
  loading: boolean;
  /** True while a mutation is in flight. */
  busy: boolean;
  error: string;
  clearError: () => void;
  addToCart: (product: Product, delivery?: Delivery) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  setDelivery: (productId: string, delivery: Delivery) => void;
  clearCart: () => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isSaved: (productId: string) => boolean;
  refresh: () => Promise<void>;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

function messageFrom(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryMap>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  /** Guards the guest→server merge so it runs once per signed-in user. */
  const mergedFor = useRef<number | null>(null);

  const signedIn = Boolean(user);

  const withDelivery = useCallback(
    (product: Product, available: boolean, map: DeliveryMap): CartItem => ({
      product,
      quantity: 1,
      delivery: map[product.id] ?? "pickup",
      available,
    }),
    [],
  );

  useEffect(() => {
    setDeliveries(readDeliveries());
    dropKey(LEGACY_ORDERS_KEY);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(DELIVERY_KEY, deliveries);
  }, [deliveries, hydrated]);

  const loadGuest = useCallback(
    (map: DeliveryMap) => {
      const products = readJson<Product[]>(CART_KEY, []);
      setCart(products.map((product) => withDelivery(product, true, map)));
      setWishlist(readJson<Product[]>(WISHLIST_KEY, []));
    },
    [withDelivery],
  );

  const loadServer = useCallback(
    async (map: DeliveryMap) => {
      const [cartDto, wishlistDto] = await Promise.all([
        cartService.get(),
        wishlistService.list(),
      ]);
      setCart(
        cartDto.items
          .filter((line) => line.product)
          .map((line) => withDelivery(mapProduct(line.product!), line.available, map)),
      );
      setWishlist(wishlistDto.map((row) => mapProduct(row.product)));
    },
    [withDelivery],
  );

  /**
   * Pushes anything collected while signed out into the server cart/wishlist,
   * then drops the guest copy. Conflicts (already there) and pieces that went
   * away are skipped rather than failing the whole merge.
   */
  const mergeGuestState = useCallback(async () => {
    const guestCart = readJson<Product[]>(CART_KEY, []);
    const guestWishlist = readJson<Product[]>(WISHLIST_KEY, []);

    for (const product of guestCart) {
      if (!product.backendId) continue;
      try {
        await cartService.addItem(product.backendId);
      } catch {
        /* already in the cart, sold, or the buyer's own listing */
      }
    }
    for (const product of guestWishlist) {
      if (!product.backendId) continue;
      try {
        await wishlistService.add(product.backendId);
      } catch {
        /* already saved or no longer available */
      }
    }

    dropKey(CART_KEY);
    dropKey(WISHLIST_KEY);
  }, []);

  const refresh = useCallback(async () => {
    const map = readDeliveries();
    if (!signedIn) {
      loadGuest(map);
      return;
    }
    await loadServer(map);
  }, [signedIn, loadGuest, loadServer]);

  useEffect(() => {
    if (!hydrated || !authReady) return;
    let cancelled = false;

    async function sync() {
      setLoading(true);
      const map = readDeliveries();
      try {
        if (!user) {
          mergedFor.current = null;
          loadGuest(map);
          return;
        }
        if (mergedFor.current !== user.id) {
          // Only mark the merge done once it actually succeeded, so a network
          // blip doesn't strand the guest cart unmerged for the whole session.
          await mergeGuestState();
          mergedFor.current = user.id;
        }
        if (!cancelled) await loadServer(map);
      } catch (err) {
        if (!cancelled) setError(messageFrom(err, "Could not load your cart."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [hydrated, authReady, user, loadGuest, loadServer, mergeGuestState]);

  const persistGuestCart = useCallback((next: CartItem[]) => {
    writeJson(
      CART_KEY,
      next.map((line) => line.product),
    );
  }, []);

  const addToCart = useCallback(
    async (product: Product, delivery: Delivery = "pickup") => {
      setError("");
      setDeliveries((prev) => ({ ...prev, [product.id]: delivery }));

      if (!signedIn) {
        setCart((prev) => {
          if (prev.some((line) => line.product.id === product.id)) return prev;
          const next = [...prev, { product, quantity: 1, delivery, available: true }];
          persistGuestCart(next);
          return next;
        });
        return;
      }

      if (!product.backendId) {
        setError("This piece can’t be added to your cart right now.");
        return;
      }

      setBusy(true);
      try {
        const dto = await cartService.addItem(product.backendId);
        const map = { ...readDeliveries(), [product.id]: delivery };
        setCart(
          dto.items
            .filter((line) => line.product)
            .map((line) => withDelivery(mapProduct(line.product!), line.available, map)),
        );
      } catch (err) {
        setError(messageFrom(err, "Could not add this piece to your cart."));
      } finally {
        setBusy(false);
      }
    },
    [signedIn, persistGuestCart, withDelivery],
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      setError("");
      const line = cart.find((row) => row.product.id === productId);

      if (!signedIn) {
        setCart((prev) => {
          const next = prev.filter((row) => row.product.id !== productId);
          persistGuestCart(next);
          return next;
        });
        return;
      }

      if (!line?.product.backendId) return;
      setBusy(true);
      try {
        const dto = await cartService.removeItem(line.product.backendId);
        const map = readDeliveries();
        setCart(
          dto.items
            .filter((row) => row.product)
            .map((row) => withDelivery(mapProduct(row.product!), row.available, map)),
        );
      } catch (err) {
        setError(messageFrom(err, "Could not remove this piece."));
      } finally {
        setBusy(false);
      }
    },
    [cart, signedIn, persistGuestCart, withDelivery],
  );

  const setDelivery = useCallback((productId: string, delivery: Delivery) => {
    setDeliveries((prev) => ({ ...prev, [productId]: delivery }));
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, delivery } : line,
      ),
    );
  }, []);

  const clearCart = useCallback(async () => {
    setError("");
    if (!signedIn) {
      setCart([]);
      dropKey(CART_KEY);
      return;
    }
    setBusy(true);
    try {
      await cartService.clear();
      setCart([]);
    } catch (err) {
      setError(messageFrom(err, "Could not clear your cart."));
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  const toggleWishlist = useCallback(
    async (product: Product) => {
      setError("");
      const saved = wishlist.some((row) => row.id === product.id);

      if (!signedIn) {
        setWishlist((prev) => {
          const next = saved
            ? prev.filter((row) => row.id !== product.id)
            : [...prev, product];
          writeJson(WISHLIST_KEY, next);
          return next;
        });
        return;
      }

      if (!product.backendId) {
        setError("This piece can’t be saved right now.");
        return;
      }

      setBusy(true);
      try {
        if (saved) {
          await wishlistService.remove(product.backendId);
          setWishlist((prev) => prev.filter((row) => row.id !== product.id));
        } else {
          const row = await wishlistService.add(product.backendId);
          setWishlist((prev) => [mapProduct(row.product), ...prev]);
        }
      } catch (err) {
        setError(messageFrom(err, "Could not update your wishlist."));
      } finally {
        setBusy(false);
      }
    },
    [wishlist, signedIn],
  );

  const isSaved = useCallback(
    (productId: string) => wishlist.some((row) => row.id === productId),
    [wishlist],
  );

  const clearError = useCallback(() => setError(""), []);

  const cartCount = cart.length;
  const cartTotal = cart.reduce(
    (sum, line) => (line.available ? sum + line.product.priceValue : sum),
    0,
  );

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      cartCount,
      cartTotal,
      loading,
      busy,
      error,
      clearError,
      addToCart,
      removeFromCart,
      setDelivery,
      clearCart,
      toggleWishlist,
      isSaved,
      refresh,
    }),
    [
      cart,
      wishlist,
      cartCount,
      cartTotal,
      loading,
      busy,
      error,
      clearError,
      addToCart,
      removeFromCart,
      setDelivery,
      clearCart,
      toggleWishlist,
      isSaved,
      refresh,
    ],
  );

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
}

export function formatEgp(amount: number) {
  return `EGP ${amount.toLocaleString("en-EG")}`;
}
