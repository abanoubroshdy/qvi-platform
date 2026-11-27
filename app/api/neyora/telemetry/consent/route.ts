import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { resolveNeyoraTelemetryPrincipal } from "@/lib/neyora/telemetry/auth";
import { buildConsentPatch, type ProfileTrainingConsent } from "@/lib/neyora/telemetry/validation";
import { toConsentResponse } from "@/lib/neyora/telemetry/consent-response";
import { NEYORA_TRAINING_CONSENT_VERSION } from "@/lib/neyora/telemetry/constants";

export const dynamic = "force-dynamic";

const CONSENT_COLUMNS =
  "training_metadata_consent, training_audio_consent, training_consent_version, training_consented_at, training_consent_updated_at";

export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "neyora-telemetry-consent"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ error: "Service is not configured.", errorCode: "not_configured" }, 503);
  }

  const principal = await resolveNeyoraTelemetryPrincipal(client, request);
  if (!principal) {
    return jsonResponse({ error: "Unauthorized.", errorCode: "unauthorized" }, 401);
  }

  const { data, error } = await client
    .from("profiles")
    .select(CONSENT_COLUMNS)
    .eq("id", principal.userId)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: "Could not load consent.", errorCode: "server_error" }, 500);
  }

  return jsonResponse(toConsentResponse((data as ProfileTrainingConsent | null) ?? null), 200);
}

type ConsentPostBody = {
  training_metadata_consent?: boolean;
  training_audio_consent?: boolean;
  training_consent_version?: string;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "neyora-telemetry-consent"))) {
    return jsonResponse({ error: "Too many requests.", errorCode: "rate_limit" }, 429);
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ error: "Service is not configured.", errorCode: "not_configured" }, 503);
  }

  const principal = await resolveNeyoraTelemetryPrincipal(client, request);
  if (!principal) {
    return jsonResponse({ error: "Unauthorized.", errorCode: "unauthorized" }, 401);
  }

  let body: ConsentPostBody;
  try {
    body = (await request.json()) as ConsentPostBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  if (
    body.training_metadata_consent === undefined &&
    body.training_audio_consent === undefined &&
    body.training_consent_version === undefined
  ) {
    return jsonResponse({ error: "No consent fields to update.", errorCode: "invalid_request" }, 400);
  }

  if (
    (body.training_metadata_consent !== undefined && typeof body.training_metadata_consent !== "boolean") ||
    (body.training_audio_consent !== undefined && typeof body.training_audio_consent !== "boolean")
  ) {
    return jsonResponse({ error: "Consent flags must be booleans.", errorCode: "invalid_request" }, 400);
  }

  const { data: current, error: readError } = await client
    .from("profiles")
    .select(CONSENT_COLUMNS)
    .eq("id", principal.userId)
    .maybeSingle();

  if (readError || !current) {
    return jsonResponse({ error: "Profile not found.", errorCode: "not_found" }, 404);
  }

  const patch = buildConsentPatch(current as ProfileTrainingConsent, {
    ...body,
    training_consent_version: body.training_consent_version ?? NEYORA_TRAINING_CONSENT_VERSION,
  });

  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update(patch)
    .eq("id", principal.userId)
    .select(CONSENT_COLUMNS)
    .single();

  if (updateError || !updated) {
    return jsonResponse({ error: "Could not save consent.", errorCode: "server_error" }, 500);
  }

  return jsonResponse(toConsentResponse(updated as ProfileTrainingConsent), 200);
}