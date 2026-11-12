import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MessengerShell from "@/components/MessengerShell";

export const metadata: Metadata = {
  title: "Conversation — Going Twice",
};

type Props = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isFinite(conversationId) || conversationId <= 0) notFound();

  return <MessengerShell activeConversationId={conversationId} />;
}
