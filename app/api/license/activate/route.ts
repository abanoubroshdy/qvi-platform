import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { activateLicense } from "@/lib/licensing/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import type { LicenseActivateRequest } from "@/lib/licensing/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "activate"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ error: "Licensing service is not configured.", errorCode: "not_configured" }, 503);
  }

  let body: LicenseActivateRequest;
  try {
    body = (await request.json()) as LicenseActivateRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  const result = await activateLicense(
    client,
    {
      productCode: body.productCode,
      licenseKey: body.licenseKey,
      accessToken: body.accessToken,
      deviceFingerprint: body.deviceFingerprint,
      deviceName: body.deviceName,
      appVersion: body.appVersion,
    },
    { ip, userAgent: request.headers.get("user-agent") },
  );

  return jsonResponse(result.body, result.status);
}