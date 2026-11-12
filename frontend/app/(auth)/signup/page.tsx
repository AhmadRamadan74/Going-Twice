import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import SignUpForm from "@/components/SignUpForm";

export const metadata: Metadata = {
  title: "Sign up — Going Twice",
  description: "Create an account to buy, sell, and save pieces on Going Twice.",
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-[36px] font-medium leading-[1.1] text-ink sm:text-[42px]">
        Join Going Twice
      </h1>
      <p className="pt-2 text-[14px] text-muted">
        Create an account to buy, sell, and save pieces.
      </p>
      <SignUpForm />
    </AuthShell>
  );
}
