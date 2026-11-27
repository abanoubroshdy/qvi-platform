import { r2Endpoint } from "@/lib/qv1-download";
import type { NeyoraModelTarget } from "@/lib/neyora/telemetry/constants";
import { EXTENSION_BY_CONTENT_TYPE } from "@/lib/neyora/telemetry/constants";

export type R2TelemetryConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function required(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Telemetry uploads use R2_TELEMETRY_BUCKET when set, otherwise R2_BUCKET.
 * Keys live under training-submissions/ (never mixed with public download objects).
 */
export function resolveR2TelemetryConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): R2TelemetryConfig | null {
  const accountId = required(env.R2_ACCOUNT_ID);
  const accessKeyId = required(env.R2_ACCESS_KEY_ID);
  const secretAccessKey = required(env.R2_SECRET_ACCESS_KEY);
  const bucket = required(env.R2_TELEMETRY_BUCKET) || required(env.R2_BUCKET);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export { r2Endpoint };

export function buildTrainingSubmissionKey(input: {
  modelTarget: NeyoraModelTarget;
  userId: string;
  submissionId: string;
  contentType: string;
}): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = EXTENSION_BY_CONTENT_TYPE[input.contentType] ?? "bin";
  return `training-submissions/${input.modelTarget}/${yyyy}-${mm}/${input.userId}/${input.submissionId}.${ext}`;
}