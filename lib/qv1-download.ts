import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { QV1_DOWNLOAD_WINDOW_MS } from "@/lib/qv1-download-window";
import { safeNextPath } from "@/lib/safe-next-path";

export { QV1_DOWNLOAD_WINDOW_MS };

export { safeNextPath };

/** Signed-in Setup downloads. Set false to pause /qv1/download without taking the page down. */
export const QV1_DOWNLOAD_ENABLED = true;

/** R2 key for the online Setup. QV1_OBJECT_KEY overrides this. */
export const QV1_DEFAULT_OBJECT_KEY = "qv1/evaluation/QV1-Setup-Evaluation.exe";

/** Signed-in download route. Anonymous visitors sign in, land on /qv1, and this route runs once from there. */
export const QV1_DOWNLOAD_PATH = "/qv1/download";
/** One-shot query on /qv1. A fresh value is issued for each sign-in return. */
export const QV1_AUTOSTART_PARAM = "autostart";
const QV1_AUTOSTART_TOKEN = /^[A-Za-z0-9_-]{16,80}$/;
const QV1_AUTOSTART_STORAGE_PREFIX = "qv1-autostart:";
export const QV1_DOWNLOAD_SOON_PATH = "/qv1?download=soon";
export const QV1_DOWNLOAD_LIMITED_PATH = "/qv1?download=limited";
export const QV1_DOWNLOAD_UNAVAILABLE_PATH = "/qv1?download=unavailable";
export const QV1_DOWNLOAD_PAUSED_PATH = "/qv1?download=paused";

/** Short-lived presign for the Setup exe. Not a standing public link. */
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
 * Account, access key, secret, and bucket are required. QV1_OBJECT_KEY
 * overrides the default Setup key. A missing credential means the installer
 * is not ready, and the page shows "Download coming soon" instead of throwing.
 */
export function resolveR2DownloadConfig(
  env: Record<string, string | undefined>,
): R2DownloadConfig | null {
  const accountId = required(env.R2_ACCOUNT_ID);
  const accessKeyId = required(env.R2_ACCESS_KEY_ID);
  const secretAccessKey = required(env.R2_SECRET_ACCESS_KEY);
  const bucket = required(env.R2_BUCKET);
  const objectKey = required(env.QV1_OBJECT_KEY) || QV1_DEFAULT_OBJECT_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !objectKey) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, objectKey };
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function isQv1AutostartToken(value: string | null | undefined): value is string {
  return typeof value === "string" && QV1_AUTOSTART_TOKEN.test(value);
}

export function createQv1AutostartToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function qv1AutostartPath(token: string): string {
  return `/qv1?${QV1_AUTOSTART_PARAM}=${encodeURIComponent(token)}`;
}

export function qv1AutostartTokenFromQuery(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return isQv1AutostartToken(raw) ? raw : null;
}

export function qv1AutostartStorageKey(token: string): string {
  return `${QV1_AUTOSTART_STORAGE_PREFIX}${token}`;
}

/** Drop the one-shot param and keep the rest of the URL on this origin. */
export function withoutQv1Autostart(href: string): string {
  const url = new URL(href, "https://getqvi.com");
  url.searchParams.delete(QV1_AUTOSTART_PARAM);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

export function isQv1AutostartConsumed(
  token: string,
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  if (!isQv1AutostartToken(token) || !storage) return false;
  try {
    return storage.getItem(qv1AutostartStorageKey(token)) === "1";
  } catch {
    return false;
  }
}

/**
 * Claim a one-shot token. "start" means this caller should download.
 * "done" means an earlier visit already did. "repeat" means this document already claimed it.
 */
export function claimQv1Autostart(
  token: string,
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  inFlight: Set<string>,
): "start" | "done" | "repeat" {
  if (!isQv1AutostartToken(token)) return "done";
  if (inFlight.has(token)) return "repeat";
  if (isQv1AutostartConsumed(token, storage)) return "done";
  try {
    storage?.setItem(qv1AutostartStorageKey(token), "1");
  } catch {
    // Private-mode storage can throw. The in-memory set still blocks a second start here.
  }
  inFlight.add(token);
  return "start";
}

function pathnameOf(path: string): string {
  const end = path.search(/[?#]/);
  return end === -1 ? path : path.slice(0, end);
}

export function isQv1DownloadNextPath(path: string): boolean {
  return pathnameOf(path) === QV1_DOWNLOAD_PATH;
}

/**
 * After auth, land on the program page. /qv1/download is a file response, so a
 * top-level navigation to it never replaces the sign-in document.
 */
export function postAuthPath(value: string | null | undefined, token?: string): string {
  const safe = safeNextPath(value);
  if (!isQv1DownloadNextPath(safe)) return safe;
  const autostart = isQv1AutostartToken(token) ? token : createQv1AutostartToken();
  return qv1AutostartPath(autostart);
}

export function loginPathForDownload(token = createQv1AutostartToken()): string {
  const autostart = isQv1AutostartToken(token) ? token : createQv1AutostartToken();
  return `/login?next=${encodeURIComponent(qv1AutostartPath(autostart))}`;
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
