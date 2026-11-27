import type { Locale } from "@/lib/i18n";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { PRODUCT_CODES, isProductCode } from "@/lib/licensing/products";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { issueProductTrial } from "@/lib/licensing/trial-issue";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSupabaseSession(request);
  if (!session) return jsonResponse({ error: "Unauthorized", errorCode: "unauthorized" }, 401);

  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(`${session.userId}`, "trial-activate"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }
  if (!checkLicenseRateLimit(rateLimitKey(ip, "trial-activate"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const service = createServiceSupabaseClient();
  if (!service) return jsonResponse({ error: "Not configured" }, 503);

  let body: {
    productCode?: string;
    locale?: string;
    training_metadata_consent?: boolean;
    training_audio_consent?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const productRaw = body.productCode?.trim() || PRODUCT_CODES.neyoraPro;
  if (!isProductCode(productRaw)) {
    return jsonResponse({ error: "Unknown product.", errorCode: "unknown_product" }, 400);
  }

  const locale: Locale | undefined = body.locale === "ar" ? "ar" : body.locale === "en" ? "en" : undefined;

  const result = await issueProductTrial(service, {
    userId: session.userId,
    productCode: productRaw,
    locale,
    trainingMetadataConsent: body.training_metadata_consent,
    trainingAudioConsent: body.training_audio_consent,
  });

  if (!result.ok) {
    return jsonResponse({ error: result.error, errorCode: result.errorCode }, result.status);
  }

  return jsonResponse({
    licenseId: result.licenseId,
    licenseKey: result.licenseKey,
    licenseKeyFormatted: result.licenseKeyFormatted,
    expiresAt: result.expiresAt,
  });
}