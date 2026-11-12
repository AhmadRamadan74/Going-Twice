import type { Metadata } from "next";
import OrderDetailView from "@/components/OrderDetailView";

export const metadata: Metadata = {
  title: "Order — Going Twice",
};

export default function OrderDetailPage() {
  return <OrderDetailView />;
}
