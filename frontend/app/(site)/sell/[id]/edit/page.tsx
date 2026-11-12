import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SellForm from "@/components/SellForm";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Edit Listing — Going Twice",
  description: "Update a draft or rejected listing and send it back for review.",
};

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const listingId = Number(id);
  if (!Number.isInteger(listingId) || listingId <= 0) notFound();
  return <SellForm listingId={listingId} />;
}
