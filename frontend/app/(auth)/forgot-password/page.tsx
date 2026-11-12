import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password — Going Twice",
  description: "Reset your Going Twice password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-[36px] font-medium leading-[1.1] text-ink sm:text-[42px]">
        Forgot Password
      </h1>
      <p className="pt-2 text-[14px] text-muted">
        Enter the email on your account and we&apos;ll send a reset link.
      </p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
