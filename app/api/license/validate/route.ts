import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { validateLicense } from "@/lib/licensing/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import type { LicenseValidateRequest } from "@/lib/licensing/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "validate"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ error: "Licensing service is not configured.", errorCode: "not_configured" }, 503);
  }

  let body: LicenseValidateRequest;
  try {
    body = (await request.json()) as LicenseValidateRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  const result = await validateLicense(
    client,
    {
      licenseToken: body.licenseToken,
      deviceFingerprint: body.deviceFingerprint,
      appVersion: body.appVersion,
    },
    { ip, userAgent: request.headers.get("user-agent") },
  );

  return jsonResponse(result.body, result.status);
}