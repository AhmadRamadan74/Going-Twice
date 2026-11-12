"use client";

import { Cormorant_Garamond, Inter } from "next/font/google";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${display.className}`}>
      <body
        className={inter.className}
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg, #efe6d4 0%, #e3e6dc 100%)",
          color: "#361f1c",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#5e4b3b",
              fontFamily: inter.style.fontFamily,
            }}
          >
            Error
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 500,
              margin: "12px 0 0",
              fontFamily: display.style.fontFamily,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#5e4b3b",
              marginTop: 12,
              maxWidth: 360,
              fontFamily: inter.style.fontFamily,
            }}
          >
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#754253",
              color: "#fff",
              border: 0,
              padding: "12px 28px",
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: inter.style.fontFamily,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
