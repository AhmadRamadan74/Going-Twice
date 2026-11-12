import type { Metadata } from "next";
import ListingPublishedView from "@/components/ListingPublishedView";

export const metadata: Metadata = {
  title: "Listing Published — Going Twice",
};

export default function ListingPublishedPage() {
  return <ListingPublishedView />;
}
