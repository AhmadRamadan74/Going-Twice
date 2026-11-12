import type { Metadata } from "next";
import WishlistView from "@/components/WishlistView";

export const metadata: Metadata = {
  title: "Wishlist — Going Twice",
};

export default function WishlistPage() {
  return <WishlistView />;
}
