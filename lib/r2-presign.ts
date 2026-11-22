import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Endpoint, resolveR2DownloadConfig } from "@/lib/qv1-download";

export const LICENSE_DOWNLOAD_PRESIGN_SECONDS = 10 * 60;

export async function presignR2GetUrl(
  objectKey: string,
  expiresInSeconds = LICENSE_DOWNLOAD_PRESIGN_SECONDS,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
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
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}