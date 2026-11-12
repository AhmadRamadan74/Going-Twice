import { api } from "../client";
import { endpoints } from "../endpoints";

export type NewsletterPayload = {
  email: string;
};

export const newsletterService = {
  async subscribe(payload: NewsletterPayload) {
    const { data } = await api.post<{ email: string }>(
      endpoints.newsletter.subscribe,
      payload,
    );
    return data;
  },
};
