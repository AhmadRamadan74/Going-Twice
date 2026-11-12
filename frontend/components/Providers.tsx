"use client";

import { AuthProvider } from "@/lib/auth-context";
import { CommerceProvider } from "@/lib/commerce";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CommerceProvider>{children}</CommerceProvider>
    </AuthProvider>
  );
}
