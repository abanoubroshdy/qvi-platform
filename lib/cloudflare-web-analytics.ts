/** Cloudflare Web Analytics browser beacon (cookieless). */
export const CF_BEACON_SCRIPT_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export function resolveCfBeaconToken(
  env?: Record<string, string | undefined>,
): string {
  return (env?.NEXT_PUBLIC_CF_BEACON_TOKEN ?? process.env.NEXT_PUBLIC_CF_BEACON_TOKEN)?.trim() ?? "";
}

export function buildCfBeaconDataAttribute(token: string): string {
  return JSON.stringify({ token });
}