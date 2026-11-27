import { afterEach, describe, expect, it, vi } from "vitest";

const getSignedUrl = vi.fn(async () => "https://example.com/signed");

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (client: unknown, command: unknown, options?: unknown) => getSignedUrl(client, command, options),
}));

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  LICENSE_DOWNLOAD_PRESIGN_SECONDS,
  artifactDownloadFilename,
  presignR2GetUrl,
  presignR2PutUrl,
} from "@/lib/r2-presign";

const ENV_KEYS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_TELEMETRY_BUCKET"] as const;
const ORIGINAL: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) ORIGINAL[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
  getSignedUrl.mockClear();
});

describe("presignR2GetUrl", () => {
  it("defaults to a 60 minute expiry", () => {
    expect(LICENSE_DOWNLOAD_PRESIGN_SECONDS).toBe(3600);
  });

  it("signs GetObject with response-content-disposition", async () => {
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET = "downloads";

    const url = await presignR2GetUrl(
      "neyora/0.1.0/Neyora-Setup.exe",
      undefined,
      process.env,
      'attachment; filename="Neyora-Setup.exe"',
    );

    expect(url).toBe("https://example.com/signed");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const call = getSignedUrl.mock.calls[0];
    const command = call![1] as GetObjectCommand;
    const options = call![2] as { expiresIn: number };
    expect(command.input.Key).toBe("neyora/0.1.0/Neyora-Setup.exe");
    expect(command.input.ResponseContentDisposition).toBe('attachment; filename="Neyora-Setup.exe"');
    expect(options.expiresIn).toBe(3600);
  });

  it("derives download filenames from storage paths", () => {
    expect(artifactDownloadFilename("neyora/0.1.0/Neyora-Setup.exe")).toBe("Neyora-Setup.exe");
    expect(artifactDownloadFilename("file-only.exe")).toBe("file-only.exe");
  });
});

describe("presignR2PutUrl", () => {
  it("returns null when R2 is not configured", async () => {
    delete process.env.R2_ACCOUNT_ID;
    const url = await presignR2PutUrl({
      objectKey: "training-submissions/lm/x",
      contentType: "application/json",
      contentLength: 10,
    });
    expect(url).toBeNull();
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("signs PutObject with bound content type and length", async () => {
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_TELEMETRY_BUCKET = "telemetry-bucket";

    const url = await presignR2PutUrl({
      objectKey: "training-submissions/lm/2026-11/u/sub.json",
      contentType: "application/json",
      contentLength: 2048,
      expiresInSeconds: 300,
    });

    expect(url).toBe("https://example.com/signed");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const call = getSignedUrl.mock.calls[0];
    expect(call).toBeDefined();
    const command = call![1] as PutObjectCommand;
    const options = call![2] as { expiresIn: number; unhoistableHeaders: Set<string> };
    expect(command.input.Bucket).toBe("telemetry-bucket");
    expect(command.input.Key).toBe("training-submissions/lm/2026-11/u/sub.json");
    expect(command.input.ContentType).toBe("application/json");
    expect(command.input.ContentLength).toBe(2048);
    expect(options.expiresIn).toBe(300);
    expect(options.unhoistableHeaders?.has("content-length")).toBe(true);
  });
});