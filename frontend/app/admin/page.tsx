import type { Metadata } from "next";
import AdminReviewView from "@/components/AdminReviewView";

export const metadata: Metadata = {
  title: "Admin Dashboard — Going Twice",
  description: "Manage listings, orders, categories, and materials.",
};

export default function AdminPage() {
  return <AdminReviewView />;
}
