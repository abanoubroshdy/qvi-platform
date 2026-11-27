import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { resolveNeyoraTelemetryPrincipal } from "@/lib/neyora/telemetry/auth";
import {
  hasConsentForModel,
  validateTrainingUploadRequest,
  type ProfileTrainingConsent,
} from "@/lib/neyora/telemetry/validation";
import { buildTrainingSubmissionKey } from "@/lib/neyora/telemetry/r2-config";
import { presignR2PutUrl } from "@/lib/r2-presign";
import { TELEMETRY_PRESIGN_SECONDS } from "@/lib/neyora/telemetry/constants";
import { countDailyTelemetryUploads, isWithinDailyQuota } from "@/lib/neyora/telemetry/quota";

export const dynamic = "force-dynamic";

type UploadUrlBody = {
  model_target: string;
  content_type: string;
  size_bytes: number;
  file_extension?: string;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "neyora-telemetry-upload"))) {
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

  let body: UploadUrlBody;
  try {
    body = (await request.json()) as UploadUrlBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  const validated = validateTrainingUploadRequest({
    modelTarget: body.model_target ?? "",
    contentType: body.content_type ?? "",
    sizeBytes: body.size_bytes,
    fileExtension: body.file_extension,
  });

  if (!validated.ok) {
    return jsonResponse({ error: validated.error, errorCode: validated.errorCode }, 400);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("training_metadata_consent, training_audio_consent")
    .eq("id", principal.userId)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonResponse({ error: "Profile not found.", errorCode: "not_found" }, 404);
  }

  if (!hasConsentForModel(profile as ProfileTrainingConsent, validated.modelTarget)) {
    return jsonResponse(
      {
        error: "Training consent is not granted for this model tier.",
        errorCode: "consent_required",
      },
      403,
    );
  }

  const dailyCount = await countDailyTelemetryUploads(client, principal.userId);
  if (!isWithinDailyQuota(dailyCount)) {
    return jsonResponse(
      { error: "Daily upload quota exceeded.", errorCode: "daily_quota_exceeded" },
      429,
    );
  }

  const submissionId = crypto.randomUUID();
  const r2Key = buildTrainingSubmissionKey({
    modelTarget: validated.modelTarget,
    userId: principal.userId,
    submissionId,
    contentType: validated.contentType,
  });

  const { data: row, error: insertError } = await client
    .from("neyora_training_submissions")
    .insert({
      id: submissionId,
      user_id: principal.userId,
      email: principal.email,
      model_target: validated.modelTarget,
      r2_key: r2Key,
      content_type: validated.contentType,
      status: "pending",
      size_bytes: validated.sizeBytes,
      metadata: {},
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return jsonResponse({ error: "Could not create submission.", errorCode: "server_error" }, 500);
  }

  const uploadUrl = await presignR2PutUrl({
    objectKey: r2Key,
    contentType: validated.contentType,
    contentLength: validated.sizeBytes,
    expiresInSeconds: TELEMETRY_PRESIGN_SECONDS,
  });

  if (!uploadUrl) {
    await client.from("neyora_training_submissions").update({ status: "rejected" }).eq("id", submissionId);
    return jsonResponse({ error: "Object storage is not configured.", errorCode: "not_configured" }, 503);
  }

  const expiresAt = new Date(Date.now() + TELEMETRY_PRESIGN_SECONDS * 1000).toISOString();

  return jsonResponse(
    {
      submission_id: submissionId,
      upload_url: uploadUrl,
      r2_key: r2Key,
      expires_at: expiresAt,
    },
    200,
  );
}