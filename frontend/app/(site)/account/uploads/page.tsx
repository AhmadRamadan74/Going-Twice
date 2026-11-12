import type { Metadata } from "next";
import MyUploadsView from "@/components/MyUploadsView";

export const metadata: Metadata = {
  title: "My Uploads — Going Twice",
};

export default function MyUploadsPage() {
  return <MyUploadsView />;
}
