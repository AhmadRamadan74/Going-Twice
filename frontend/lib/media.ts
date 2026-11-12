const DEFAULT_API_BASE = "http://localhost:8000/api/v1";

export function apiOrigin() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE).replace(
    /\/$/,
    "",
  );
  return base.replace(/\/api\/v1$/i, "");
}

/** Turns an API image path into a URL the browser / next/image can load. */
export function mediaUrl(src?: string | null): string {
  if (!src) return "";
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  if (src.startsWith("/uploads/")) return `${apiOrigin()}${src}`;
  return src;
}
