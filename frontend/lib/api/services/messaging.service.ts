import { api } from "../client";
import { endpoints } from "../endpoints";

export type ConversationDto = {
  id: number;
  product_id: number;
  product_name: string | null;
  product_slug: string | null;
  product_image: string | null;
  other_party_id: number;
  other_party_name: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
};

export type MessageDto = {
  id: number;
  conversation_id: number;
  sender_id: number;
  is_mine: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
};

export const messagingService = {
  async startConversation(productId: number, message: string) {
    const { data } = await api.post<ConversationDto>(endpoints.messages.conversations, {
      product_id: productId,
      message,
    });
    return data;
  },

  async listConversations() {
    const { data } = await api.get<{ items: ConversationDto[] }>(endpoints.messages.conversations);
    return data.items ?? [];
  },

  async getConversation(id: number) {
    const { data } = await api.get<ConversationDto>(endpoints.messages.conversation(id));
    return data;
  },

  async listMessages(id: number, afterId = 0) {
    const { data } = await api.get<{ items: MessageDto[] }>(endpoints.messages.messages(id), {
      params: afterId ? { after_id: afterId } : undefined,
    });
    return data.items ?? [];
  },

  async sendMessage(id: number, body: string) {
    const { data } = await api.post<MessageDto>(endpoints.messages.messages(id), { body });
    return data;
  },

  async unreadCount() {
    const { data } = await api.get<{ count: number }>(endpoints.messages.unreadCount);
    return data.count ?? 0;
  },
};
