export const DEFAULT_SUPABASE_URL = "https://eiwvlsmgrhzzriuaftfx.supabase.co";
export const DEFAULT_SITE_URL = "https://getqvi.com";

export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function isSupabaseHost(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return /supabase\.(co|in)/i.test(value);
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return atob(padded);
}

export function isLikelyServiceRoleKey(key: string): boolean {
  const parts = key.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function firstString(values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed.replace(/\/$/, "");
  }
  return "";
}

export function resolvePublicSupabaseConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): PublicSupabaseConfig | null {
  const misplacedSiteUrl = isSupabaseHost(env.NEXT_PUBLIC_SITE_URL) ? env.NEXT_PUBLIC_SITE_URL : "";
  const url = firstString([
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL,
    misplacedSiteUrl,
    DEFAULT_SUPABASE_URL,
  ]);
  const anonKey = firstString([
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
  ]);

  if (!url || !anonKey || isLikelyServiceRoleKey(anonKey)) return null;
  return { url, anonKey };
}

export function resolveSiteUrl(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && !isSupabaseHost(raw)) return raw.replace(/\/$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return DEFAULT_SITE_URL;
}
