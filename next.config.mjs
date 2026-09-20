/** @type {import('next').NextConfig} */

function isSupabaseHost(value = "") {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim().replace(/\/$/, "");
  }
  return "";
}

function isServiceRoleKey(key) {
  try {
    const part = key.split(".")[1];
    if (!part) return false;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role === "service_role";
  } catch {
    return false;
  }
}

const supabaseUrl = firstString(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
  isSupabaseHost(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : "",
  "https://eiwvlsmgrhzzriuaftfx.supabase.co",
);

let supabaseAnonKey = firstString(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);
if (supabaseAnonKey && isServiceRoleKey(supabaseAnonKey)) supabaseAnonKey = "";

const siteUrl = firstString(
  isSupabaseHost(process.env.NEXT_PUBLIC_SITE_URL) ? "" : process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
    : "",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : "",
  "https://qvi.audio",
);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    ...(supabaseAnonKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } : {}),
  },
  allowedDevOrigins: ["*.trycloudflare.com"],
  webpack(config) {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/brand.css",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
