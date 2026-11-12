"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiError,
  authService,
  tokenStorage,
  type LoginPayload,
  type RegisterPayload,
  type User,
  type VerificationChallenge,
} from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendVerification: () => Promise<VerificationChallenge>;
  verifyEmail: (code: string) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await authService.me());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        tokenStorage.clear();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const sendVerification = useCallback(() => authService.sendVerification(), []);

  const verifyEmail = useCallback(async (code: string) => {
    const next = await authService.verifyEmail(code);
    setUser(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      refreshUser,
      sendVerification,
      verifyEmail,
    }),
    [
      user,
      ready,
      login,
      register,
      logout,
      refreshUser,
      sendVerification,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
