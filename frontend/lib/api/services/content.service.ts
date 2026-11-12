import { api } from "../client";
import { endpoints } from "../endpoints";

export type ArticleDto = {
  id: number;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  image_url: string;
  published_at: string;
  body_paragraphs?: string[];
};

export type FaqDto = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
};

export type ContactPayload = {
  full_name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

type BackendPage<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export const journalService = {
  async list() {
    const { data } = await api.get<BackendPage<ArticleDto>>(endpoints.journal.list);
    return data.items;
  },

  async getBySlug(slug: string) {
    const { data } = await api.get<ArticleDto>(endpoints.journal.detail(slug));
    return data;
  },
};

export const faqService = {
  async list() {
    const { data } = await api.get<FaqDto[]>(endpoints.faq.list);
    return data;
  },
};

export const contactService = {
  async send(payload: ContactPayload) {
    const { data } = await api.post<{ id: number }>(endpoints.contact.messages, payload);
    return data;
  },
};
