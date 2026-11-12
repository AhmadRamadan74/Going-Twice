import type { Metadata } from "next";
import HowItWorksView from "@/components/HowItWorksView";

export const metadata: Metadata = {
  title: "How It Works — Going Twice",
  description:
    "Buy and sell curated vintage pieces directly — InstaPay or bank transfer, confirmed handover.",
};

export default function HowItWorksPage() {
  return <HowItWorksView />;
}
