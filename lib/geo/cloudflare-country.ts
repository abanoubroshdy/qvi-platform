import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requestCfCountry } from "@/lib/geo/request-country";

/**
 * `request.cf.country`, including the copy OpenNext stores for the Next.js handler.
 * Sync context only: the async mode boots Wrangler on Node and would break Vercel.
 */
export function cloudflareRequestCountry(request: Request): {
  requestCfCountry: string | null;
  contextCfCountry: string | null;
} {
  const requestCfCountryValue = requestCfCountry(request);
  let contextCfCountry: string | null = null;
  try {
    const cf = getCloudflareContext().cf as { country?: unknown } | undefined;
    contextCfCountry = typeof cf?.country === "string" ? cf.country : null;
  } catch {
    contextCfCountry = null;
  }
  return { requestCfCountry: requestCfCountryValue, contextCfCountry };
}
