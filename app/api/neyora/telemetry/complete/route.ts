import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { checkLicenseRateLimit, rateLimitKey } from "@/lib/licensing/rate-limit";
import { clientIp, jsonResponse } from "@/lib/licensing/http";
import { resolveNeyoraTelemetryPrincipal } from "@/lib/neyora/telemetry/auth";

export const dynamic = "force-dynamic";

const SHA256_RE = /^[a-f0-9]{64}$/i;

type CompleteBody = {
  submission_id: string;
  sha256: string;
  size_bytes: number;
  sample_count?: number;
  app_version?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkLicenseRateLimit(rateLimitKey(ip, "neyora-telemetry-complete"))) {
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

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", errorCode: "invalid_request" }, 400);
  }

  const submissionId = body.submission_id?.trim() ?? "";
  if (!submissionId) {
    return jsonResponse({ error: "submission_id is required.", errorCode: "invalid_request" }, 400);
  }

  const sha256 = body.sha256?.trim().toLowerCase() ?? "";
  if (!SHA256_RE.test(sha256)) {
    return jsonResponse({ error: "sha256 must be a 64-character hex digest.", errorCode: "invalid_request" }, 400);
  }

  const sizeBytes = body.size_bytes;
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || !Number.isInteger(sizeBytes)) {
    return jsonResponse({ error: "size_bytes must be a positive integer.", errorCode: "invalid_request" }, 400);
  }

  let sampleCount: number | null = null;
  if (body.sample_count !== undefined && body.sample_count !== null) {
    if (!Number.isInteger(body.sample_count) || body.sample_count < 0) {
      return jsonResponse({ error: "sample_count must be a non-negative integer.", errorCode: "invalid_request" }, 400);
    }
    sampleCount = body.sample_count;
  }

  const appVersion = body.app_version?.trim() ? body.app_version.trim().slice(0, 64) : null;
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  const { data: submission, error: loadError } = await client
    .from("neyora_training_submissions")
    .select("id, user_id, status, size_bytes")
    .eq("id", submissionId)
    .maybeSingle();

  if (loadError) {
    return jsonResponse({ error: "Could not load submission.", errorCode: "server_error" }, 500);
  }

  if (!submission) {
    return jsonResponse({ error: "Submission not found.", errorCode: "not_found" }, 404);
  }

  if (submission.user_id !== principal.userId) {
    return jsonResponse({ error: "Submission does not belong to this account.", errorCode: "forbidden" }, 403);
  }

  if (submission.status !== "pending") {
    return jsonResponse({ error: "Submission is not pending.", errorCode: "invalid_state" }, 409);
  }

  if (typeof submission.size_bytes === "number" && sizeBytes !== submission.size_bytes) {
    return jsonResponse(
      { error: "size_bytes does not match the declared upload size.", errorCode: "size_mismatch" },
      400,
    );
  }

  const completedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await client
    .from("neyora_training_submissions")
    .update({
      status: "completed",
      sha256,
      size_bytes: sizeBytes,
      sample_count: sampleCount,
      app_version: appVersion,
      metadata,
      completed_at: completedAt,
    })
    .eq("id", submissionId)
    .eq("user_id", principal.userId)
    .select("id, status, completed_at")
    .single();

  if (updateError || !updated) {
    return jsonResponse({ error: "Could not complete submission.", errorCode: "server_error" }, 500);
  }

  return jsonResponse(
    {
      submission_id: updated.id,
      status: updated.status,
      completed_at: updated.completed_at,
    },
    200,
  );
}