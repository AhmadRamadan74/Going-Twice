import type { Metadata } from "next";
import MessengerShell from "@/components/MessengerShell";

export const metadata: Metadata = {
  title: "Messages — Going Twice",
};

export default function MessagesPage() {
  return <MessengerShell />;
}
