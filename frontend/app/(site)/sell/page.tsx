import type { Metadata } from "next";
import SellForm from "@/components/SellForm";

export const metadata: Metadata = {
  title: "List a New Piece — Going Twice",
  description:
    "List your vintage furniture, lighting, or art on Cairo's curated marketplace.",
};

export default function SellPage() {
  return <SellForm />;
}
