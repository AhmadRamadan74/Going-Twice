import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password — Going Twice",
  description: "Choose a new password for your Going Twice account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-[36px] font-medium leading-[1.1] text-ink sm:text-[42px]">
        Set a New Password
      </h1>
      <p className="pt-2 text-[14px] text-muted">
        Choose a password of at least 6 characters.
      </p>
      <ResetPasswordForm />
    </AuthShell>
  );
}
