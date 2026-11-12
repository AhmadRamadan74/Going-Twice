import type { Metadata } from "next";
import MyOrdersView from "@/components/MyOrdersView";

export const metadata: Metadata = {
  title: "My Orders — Going Twice",
};

export default function MyOrdersPage() {
  return <MyOrdersView />;
}
