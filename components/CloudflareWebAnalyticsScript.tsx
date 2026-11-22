import Script from "next/script";
import {
  CF_BEACON_SCRIPT_SRC,
  buildCfBeaconDataAttribute,
  resolveCfBeaconToken,
} from "@/lib/cloudflare-web-analytics";

/**
 * Cookieless Cloudflare Web Analytics beacon. Safe to load without marketing consent.
 * Requires DNS-only (non-proxied) origins such as getqvi.com on Vercel.
 */
export function CloudflareWebAnalyticsScript() {
  const token = resolveCfBeaconToken();
  if (!token) return null;

  return (
    <Script
      defer
      src={CF_BEACON_SCRIPT_SRC}
      strategy="afterInteractive"
      data-cf-beacon={buildCfBeaconDataAttribute(token)}
    />
  );
}