import type { Metadata } from "next";
import AccountView from "@/components/AccountView";

export const metadata: Metadata = {
  title: "Account — Going Twice",
  description: "Manage your Going Twice profile, listings, and saved pieces.",
};

export default function AccountPage() {
  return <AccountView />;
}
