import { api } from "../client";
import { endpoints } from "../endpoints";
import { tokenStorage } from "../token";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
};

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  pickup_address?: {
    city?: string;
    area?: string;
    street?: string;
    building?: string;
  } | null;
  payout_wallets?: Array<{
    id?: string;
    type: string;
    handle: string;
  }>;
  payout_bank?: {
    holder_name: string;
    bank_name: string;
    iban: string;
  } | null;
};

export type VerificationChallenge = {
  /** Seconds the caller must wait before another code can be requested. */
  resend_after_seconds: number;
  expires_in_minutes: number;
  /** Only present outside production, so local dev can verify without a mailbox. */
  debug_code?: string | null;
};

const VERIFICATION_KEY = "gt_verification";

export function peekVerificationChallenge(): VerificationChallenge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VERIFICATION_KEY);
    return raw ? (JSON.parse(raw) as VerificationChallenge) : null;
  } catch {
    return null;
  }
}

export function takeVerificationChallenge(): VerificationChallenge | null {
  const challenge = peekVerificationChallenge();
  if (typeof window !== "undefined") sessionStorage.removeItem(VERIFICATION_KEY);
  return challenge;
}

export function storeVerificationChallenge(challenge?: VerificationChallenge | null) {
  if (typeof window === "undefined" || !challenge) return;
  sessionStorage.setItem(VERIFICATION_KEY, JSON.stringify(challenge));
}

type AuthPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  verification?: VerificationChallenge | null;
};

function persist(data: AuthPayload) {
  tokenStorage.setTokens(data.access_token, data.refresh_token);
  return data;
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<AuthPayload>(endpoints.auth.login, payload);
    return persist(data);
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post<AuthPayload>(endpoints.auth.register, payload);
    storeVerificationChallenge(data.verification);
    return persist(data);
  },

  async me() {
    const { data } = await api.get<User>(endpoints.auth.me);
    return data;
  },

  async updateProfile(payload: {
    full_name?: string;
    phone_number?: string;
    pickup_address?: {
      city?: string;
      area?: string;
      street?: string;
      building?: string;
    };
    payout_wallets?: Array<{ id?: string; type: string; handle: string }>;
    payout_bank?: {
      holder_name: string;
      bank_name: string;
      iban: string;
    } | null;
  }) {
    const { data } = await api.patch<User>(endpoints.auth.me, payload);
    return data;
  },

  async logout() {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await api.post(endpoints.auth.logout, { refresh_token: refreshToken });
    } finally {
      tokenStorage.clear();
    }
  },

  async forgotPassword(email: string) {
    const { data } = await api.post<{ reset_link?: string } | null>(
      endpoints.auth.forgotPassword,
      { email },
    );
    return data;
  },

  async resetPassword(token: string, password: string) {
    await api.post(endpoints.auth.resetPassword, { token, password });
  },

  async sendVerification() {
    const { data } = await api.post<VerificationChallenge>(
      endpoints.auth.sendVerification,
    );
    return data;
  },

  async verifyEmail(code: string) {
    const { data } = await api.post<User>(endpoints.auth.verifyEmail, { code });
    return data;
  },
};
