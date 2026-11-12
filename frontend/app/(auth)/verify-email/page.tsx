import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import VerifyEmailForm from "@/components/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify your email — Going Twice",
  description: "Confirm your email address to finish setting up your account.",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-[36px] font-medium leading-[1.1] text-ink sm:text-[42px]">
        Confirm Your Email
      </h1>
      <p className="pt-2 text-[14px] text-muted">
        One quick step before you can buy or sell.
      </p>
      <VerifyEmailForm />
    </AuthShell>
  );
}
