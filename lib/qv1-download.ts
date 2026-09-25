import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { QV1_DOWNLOAD_WINDOW_MS } from "@/lib/qv1-download-window";
import { safeNextPath } from "@/lib/safe-next-path";

export { QV1_DOWNLOAD_WINDOW_MS };

export { safeNextPath };

/** Signed-in download route. Anonymous visitors are sent to sign in and returned here. */
export const QV1_DOWNLOAD_PATH = "/qv1/download";
export const QV1_DOWNLOAD_SOON_PATH = "/qv1?download=soon";
export const QV1_DOWNLOAD_LIMITED_PATH = "/qv1?download=limited";
export const QV1_DOWNLOAD_UNAVAILABLE_PATH = "/qv1?download=unavailable";

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

export type Qv1DownloadKind = "login" | "soon" | "limited" | "unavailable" | "redirect";

export type Qv1DownloadDecision =
  | { kind: "login" | "soon" | "limited" | "unavailable" }
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

export async function planQv1Download(input: {
  userId: string | null;
  config: R2DownloadConfig | null;
  recentCount: number;
  sign: (config: R2DownloadConfig) => Promise<string>;
  record: () => Promise<void>;
}): Promise<Qv1DownloadDecision> {
  if (!input.userId) return { kind: "login" };
  if (!input.config) return { kind: "soon" };
  if (isQv1DownloadRateLimited(input.recentCount)) return { kind: "limited" };

  try {
    const url = await input.sign(input.config);
    await input.record();
    if (!url.startsWith("https://")) return { kind: "unavailable" };
    return { kind: "redirect", url };
  } catch {
    return { kind: "unavailable" };
  }
}

export function qv1DownloadLocation(decision: Qv1DownloadDecision): string {
  if (decision.kind === "redirect") return decision.url;
  if (decision.kind === "login") return loginPathForDownload();
  if (decision.kind === "soon") return QV1_DOWNLOAD_SOON_PATH;
  if (decision.kind === "limited") return QV1_DOWNLOAD_LIMITED_PATH;
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
