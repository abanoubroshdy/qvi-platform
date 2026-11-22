import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { checkProductUpdate } from "@/lib/licensing/updates";
import { isProductCode } from "@/lib/licensing/products";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { licenseHasCloudUpdates, resolveVerifiedLicenseBearer } from "@/lib/licensing/token-access";
import { verifyLicenseToken } from "@/lib/licensing/jwt";

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
    const verified = verifyLicenseToken(bearer);
    if (verified.ok && verified.payload.product === product) {
      const context = await resolveVerifiedLicenseBearer(client, bearer, product);
      if (context) {
        allowPaidChannel = licenseHasCloudUpdates(context.entitlements);
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