import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in — Going Twice",
  description: "Log in to continue to your Going Twice account.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-[36px] font-medium leading-[1.1] text-ink sm:text-[42px]">
        Welcome Back
      </h1>
      <p className="pt-2 text-[14px] text-muted">Log in to continue to your account.</p>
      <LoginForm />
    </AuthShell>
  );
}
