import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { decodeLicenseToken } from "@/lib/licensing/jwt";
import { loadLicenseByToken } from "@/lib/licensing/service";
import { checkProductUpdate } from "@/lib/licensing/updates";
import { entitlementsForProduct, isProductCode } from "@/lib/licensing/products";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "updates"))) {
    return jsonResponse({ updateAvailable: false, error: "Too many requests." }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ updateAvailable: false, error: "Updates service is not configured." }, 503);
  }

  const url = new URL(request.url);
  const product = url.searchParams.get("product")?.trim() ?? "";
  const version = url.searchParams.get("version")?.trim() ?? "0.0.0";

  if (!isProductCode(product)) {
    return jsonResponse({ updateAvailable: false, error: "Unknown product." }, 400);
  }

  let allowPaidChannel = false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer) {
    const payload = decodeLicenseToken(bearer);
    if (payload?.sub) {
      const license = await loadLicenseByToken(client, bearer);
      if (license) {
        const entitlements = entitlementsForProduct(product);
        const features = payload.entitlements ?? entitlements;
        allowPaidChannel = features.some((f) => f.toLowerCase() === "cloudupdates");
      }
    }
  }

  const response = await checkProductUpdate(client, {
    productCode: product,
    currentVersion: version,
    allowPaidChannel,
  });

  return jsonResponse(response, 200);
}