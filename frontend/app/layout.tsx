import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

/* Site-wide: Cormorant Garamond (display) + Inter (UI / body). */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Going Twice — A Home Less Ordinary",
  description:
    "Cairo's curated vintage marketplace. Buy and sell remarkable vintage furniture, lighting, and art — direct from private homes across Egypt.",
  icons: {
    icon: "/logo/favicon.png",
    apple: "/logo/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
