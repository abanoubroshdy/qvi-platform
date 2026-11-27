import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  checkProductUpdate,
  defaultUpdateChannel,
  paidUpdateChannelRequiresBearer,
  parseUpdateChannel,
} from "@/lib/licensing/updates";
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

  const channelParam = parseUpdateChannel(url.searchParams.get("channel"));
  if (url.searchParams.get("channel")?.trim() && !channelParam) {
    return jsonResponse({ updateAvailable: false, error: "Invalid channel." }, 400);
  }
  const channel = channelParam ?? defaultUpdateChannel(product);

  let allowPaidChannel = false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (paidUpdateChannelRequiresBearer(product, channel)) {
    if (!bearer) {
      return jsonResponse({ updateAvailable: false, error: "Authorization required." }, 401);
    }
  }

  if (bearer) {
    const verified = verifyLicenseToken(bearer);
    if (!verified.ok || verified.payload.product !== product) {
      if (paidUpdateChannelRequiresBearer(product, channel)) {
        return jsonResponse({ updateAvailable: false, error: "Invalid license token." }, 401);
      }
    } else {
      const context = await resolveVerifiedLicenseBearer(client, bearer, product);
      if (context) {
        allowPaidChannel = licenseHasCloudUpdates(context.entitlements);
      } else if (paidUpdateChannelRequiresBearer(product, channel)) {
        return jsonResponse({ updateAvailable: false, error: "Invalid license token." }, 401);
      }
    }
  }

  if (paidUpdateChannelRequiresBearer(product, channel) && !allowPaidChannel) {
    return jsonResponse({ updateAvailable: false, error: "Updates are not available for this license state." }, 403);
  }

  const response = await checkProductUpdate(client, {
    productCode: product,
    currentVersion: version,
    channel,
    allowPaidChannel,
  });

  return jsonResponse(response, 200);
}