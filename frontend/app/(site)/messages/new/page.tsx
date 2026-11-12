import type { Metadata } from "next";
import NewConversationView from "@/components/NewConversationView";

export const metadata: Metadata = {
  title: "New Message — Going Twice",
};

export default function NewConversationPage() {
  return <NewConversationView />;
}
