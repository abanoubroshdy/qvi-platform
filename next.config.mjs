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
  "https://getqvi.com",
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
  async redirects() {
    return [
      {
        source: "/lab",
        destination: "/products/neyora",
        statusCode: 301,
      },
      {
        // Public. The QV1 Setup fetches these URLs with no session.
        // Keep this off any auth middleware matcher (there is none today).
        source: "/downloads/evaluation/:path*",
        destination: "https://dl.getqvi.com/qv1/evaluation/:path*",
        permanent: false,
      },
    ];
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
        // AdSense display frames do not send COEP. credentialless still blocks
        // them (coep-frame-resource-needs-coep-header) and the slot paints a
        // broken "refused to connect" frame instead of an ad.
        // Video tools therefore are not cross-origin isolated. ffmpeg.wasm
        // detects that and uses the single-thread core. Do not set COEP on
        // these routes: it would break ads on every free tool, including the
        // converters. Other pages keep credentialless (studio included).
        source: "/tools/:slug",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" }],
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
