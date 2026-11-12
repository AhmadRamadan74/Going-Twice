import type { NextConfig } from "next";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

function assertProductionBuild() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    throw new Error(
      "NEXT_PUBLIC_USE_MOCK_DATA cannot be true in a production build.",
    );
  }
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be set at build time, e.g. https://api.your-domain.com/api/v1",
    );
  }
  if (/localhost|127\.0\.0\.1/i.test(apiBaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL cannot point at localhost in a production build.",
    );
  }
}

function mediaPattern() {
  try {
    const url = new URL(apiBase);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/uploads/**" as const,
    };
  } catch {
    return {
      protocol: "http" as const,
      hostname: "localhost",
      port: "8000",
      pathname: "/uploads/**" as const,
    };
  }
}

assertProductionBuild();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      mediaPattern(),
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
