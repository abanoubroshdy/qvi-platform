import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Endpoint, resolveR2DownloadConfig } from "@/lib/qv1-download";
import { resolveR2TelemetryConfig, r2Endpoint as telemetryR2Endpoint } from "@/lib/neyora/telemetry/r2-config";

export const LICENSE_DOWNLOAD_PRESIGN_SECONDS = 60 * 60;

export type PresignR2PutInput = {
  objectKey: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
  env?: Record<string, string | undefined>;
};

export async function presignR2GetUrl(
  objectKey: string,
  expiresInSeconds = LICENSE_DOWNLOAD_PRESIGN_SECONDS,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  responseContentDisposition?: string,
): Promise<string | null> {
  const config = resolveR2DownloadConfig(env);
  if (!config) return null;

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
    Key: objectKey,
    ...(responseContentDisposition
      ? { ResponseContentDisposition: responseContentDisposition }
      : {}),
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function presignR2PutUrl(
  input: PresignR2PutInput,
): Promise<string | null> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const config = resolveR2TelemetryConfig(env);
  if (!config) return null;

  const expiresInSeconds = input.expiresInSeconds ?? 10 * 60;
  const client = new S3Client({
    region: "auto",
    endpoint: telemetryR2Endpoint(config.accountId),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.objectKey,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  return getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
    unhoistableHeaders: new Set(["content-length"]),
  });
}

export function artifactDownloadFilename(storagePath: string): string {
  const trimmed = storagePath.trim();
  if (!trimmed) return "download";
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "download";
}