import type { Metadata } from "next";
import CheckoutSuccessView from "@/components/CheckoutSuccessView";

export const metadata: Metadata = {
  title: "Payment Successful — Going Twice",
};

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessView />;
}
