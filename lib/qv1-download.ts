import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { QV1_DOWNLOAD_WINDOW_MS } from "@/lib/qv1-download-window";
import { safeNextPath } from "@/lib/safe-next-path";

export { QV1_DOWNLOAD_WINDOW_MS };

export { safeNextPath };

/** Flip to true when the installer issue is fixed and downloads should resume. */
export const QV1_DOWNLOAD_ENABLED = false;

/** Signed-in download route. Anonymous visitors are sent to sign in and returned here. */
export const QV1_DOWNLOAD_PATH = "/qv1/download";
export const QV1_DOWNLOAD_SOON_PATH = "/qv1?download=soon";
export const QV1_DOWNLOAD_LIMITED_PATH = "/qv1?download=limited";
export const QV1_DOWNLOAD_UNAVAILABLE_PATH = "/qv1?download=unavailable";
export const QV1_DOWNLOAD_PAUSED_PATH = "/qv1?download=paused";

/** Short-lived presign. Long enough for a multi-gigabyte zip, not a standing public link. */
export const QV1_PRESIGN_SECONDS = 60 * 60;
export const QV1_DOWNLOADS_PER_HOUR = 8;

export type R2DownloadConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  objectKey: string;
};

export type Qv1DownloadKind = "login" | "soon" | "limited" | "unavailable" | "paused" | "redirect";

export type Qv1DownloadDecision =
  | { kind: "login" | "soon" | "limited" | "unavailable" | "paused" }
  | { kind: "redirect"; url: string };

function required(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * All five server env vars are required. A missing value means the installer
 * is not ready, and the page shows "Download coming soon" instead of throwing.
 */
export function resolveR2DownloadConfig(
  env: Record<string, string | undefined>,
): R2DownloadConfig | null {
  const accountId = required(env.R2_ACCOUNT_ID);
  const accessKeyId = required(env.R2_ACCESS_KEY_ID);
  const secretAccessKey = required(env.R2_SECRET_ACCESS_KEY);
  const bucket = required(env.R2_BUCKET);
  const objectKey = required(env.QV1_OBJECT_KEY);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !objectKey) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, objectKey };
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function loginPathForDownload(): string {
  return `/login?next=${encodeURIComponent(QV1_DOWNLOAD_PATH)}`;
}

export function contentDispositionAttachment(fileName: string): string {
  const safe = fileName.replace(/["\r\n]/g, "") || "download";
  return `attachment; filename="${safe}"`;
}

export function isQv1DownloadRateLimited(
  recentCount: number,
  limit = QV1_DOWNLOADS_PER_HOUR,
): boolean {
  return Number.isFinite(recentCount) && recentCount >= limit;
}

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "QV1_OBJECT_KEY",
] as const;

/** Names only. Never include the values; those are secrets. */
export function missingR2DownloadEnv(env: Record<string, string | undefined>): string[] {
  return R2_ENV_KEYS.filter((key) => !env[key]?.trim());
}

export function qv1DownloadErrorDetail(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return "unknown error";
}

/** One log line. Long tokens (signatures, keys) are redacted. */
export function qv1DownloadLogLine(stage: string, detail: string): string {
  const redacted = detail.replace(/[A-Za-z0-9+/_=-]{24,}/g, "[redacted]").replace(/[\r\n]+/g, " ");
  return `[qv1-download] ${stage}: ${redacted.slice(0, 300)}`;
}

export async function planQv1Download(input: {
  userId: string | null;
  config: R2DownloadConfig | null;
  recentCount: number;
  sign: (config: R2DownloadConfig) => Promise<string>;
  record: () => Promise<void>;
  report?: (stage: "sign" | "record", error: unknown) => void;
  enabled?: boolean;
}): Promise<Qv1DownloadDecision> {
  if (!(input.enabled ?? true)) return { kind: "paused" };
  if (!input.userId) return { kind: "login" };
  if (!input.config) return { kind: "soon" };
  if (isQv1DownloadRateLimited(input.recentCount)) return { kind: "limited" };

  let url: string;
  try {
    url = await input.sign(input.config);
  } catch (error) {
    input.report?.("sign", error);
    return { kind: "unavailable" };
  }
  if (!url.startsWith("https://")) {
    input.report?.("sign", new Error("presigned url was not https"));
    return { kind: "unavailable" };
  }

  try {
    await input.record();
  } catch (error) {
    // A missing qv1_downloads table must not stop the file from downloading.
    input.report?.("record", error);
  }
  return { kind: "redirect", url };
}

export function qv1DownloadLocation(decision: Qv1DownloadDecision): string {
  if (decision.kind === "redirect") return decision.url;
  if (decision.kind === "login") return loginPathForDownload();
  if (decision.kind === "soon") return QV1_DOWNLOAD_SOON_PATH;
  if (decision.kind === "limited") return QV1_DOWNLOAD_LIMITED_PATH;
  if (decision.kind === "paused") return QV1_DOWNLOAD_PAUSED_PATH;
  return QV1_DOWNLOAD_UNAVAILABLE_PATH;
}

export async function presignQv1Object(
  config: R2DownloadConfig,
  fileName: string,
  expiresIn = QV1_PRESIGN_SECONDS,
): Promise<string> {
  const client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(config.accountId),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: config.objectKey,
    ResponseContentDisposition: contentDispositionAttachment(fileName),
  });
  return getSignedUrl(client, command, { expiresIn });
}
