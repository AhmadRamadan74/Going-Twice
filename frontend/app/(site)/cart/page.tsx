import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Your Cart — Going Twice",
};

export default function CartPage() {
  return <CartView />;
}
