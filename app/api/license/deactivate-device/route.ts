import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { deactivateLicenseDevice } from "@/lib/licensing/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import type { LicenseDeactivateRequest } from "@/lib/licensing/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "deactivate"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ error: "Licensing service is not configured.", errorCode: "not_configured" }, 503);
  }

  let body: LicenseDeactivateRequest;
  try {
    body = (await request.json()) as LicenseDeactivateRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  const result = await deactivateLicenseDevice(
    client,
    {
      licenseToken: body.licenseToken,
      deviceFingerprint: body.deviceFingerprint,
    },
    { ip, userAgent: request.headers.get("user-agent") },
  );

  if (!result.ok) return jsonResponse({ error: "Could not deactivate device." }, result.status);
  return jsonResponse({ ok: true }, result.status);
}