import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/qv1/download/route";
import {
  QV1_DOWNLOAD_ENABLED,
  QV1_DOWNLOADS_PER_HOUR,
  contentDispositionAttachment,
  isQv1DownloadRateLimited,
  loginPathForDownload,
  missingR2DownloadEnv,
  planQv1Download,
  qv1DownloadLocation,
  qv1DownloadLogLine,
  resolveR2DownloadConfig,
  safeNextPath,
  type R2DownloadConfig,
} from "@/lib/qv1-download";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { countRecentQv1Downloads, insertQv1Download } from "@/lib/supabase/qv1-downloads";

vi.mock("@/lib/supabase/request-session", () => ({
  getRequestSupabaseSession: vi.fn(async () => null),
}));

vi.mock("@/lib/supabase/qv1-downloads", () => ({
  countRecentQv1Downloads: vi.fn(async () => 0),
  insertQv1Download: vi.fn(async () => undefined),
}));

const ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "QV1_OBJECT_KEY",
  "QV1_DOWNLOAD_URL",
] as const;

const ORIGINAL: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) ORIGINAL[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
  vi.mocked(getRequestSupabaseSession).mockResolvedValue(null);
  vi.mocked(countRecentQv1Downloads).mockResolvedValue(0);
  vi.mocked(insertQv1Download).mockResolvedValue(undefined);
});

const config: R2DownloadConfig = {
  accountId: "account",
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucket: "qv1-downloads",
  objectKey: "qv1/1.2.0/QV1-Setup-Evaluation.zip",
};

function fullEnv(): Record<string, string> {
  return {
    R2_ACCOUNT_ID: config.accountId,
    R2_ACCESS_KEY_ID: config.accessKeyId,
    R2_SECRET_ACCESS_KEY: config.secretAccessKey,
    R2_BUCKET: config.bucket,
    QV1_OBJECT_KEY: config.objectKey,
  };
}

describe("resolveR2DownloadConfig", () => {
  it("returns null when any required variable is missing", () => {
    expect(resolveR2DownloadConfig({})).toBeNull();
    const partial = fullEnv();
    delete (partial as { R2_SECRET_ACCESS_KEY?: string }).R2_SECRET_ACCESS_KEY;
    expect(resolveR2DownloadConfig(partial)).toBeNull();
    expect(resolveR2DownloadConfig({ ...fullEnv(), R2_BUCKET: "  " })).toBeNull();
  });

  it("reads the five server variables and ignores a leftover public URL", () => {
    expect(resolveR2DownloadConfig({ ...fullEnv(), QV1_DOWNLOAD_URL: "https://dl.getqvi.com/file.zip" })).toEqual(
      config,
    );
  });
});

describe("download guards", () => {
  it("keeps the return path on this site", () => {
    expect(safeNextPath("/qv1/download")).toBe("/qv1/download");
    expect(safeNextPath("https://evil.example/steal")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(loginPathForDownload()).toBe("/login?next=%2Fqv1%2Fdownload");
  });

  it("sets an attachment filename and a per-hour cap", () => {
    expect(contentDispositionAttachment('QV1-Setup-Evaluation.zip')).toBe(
      'attachment; filename="QV1-Setup-Evaluation.zip"',
    );
    expect(isQv1DownloadRateLimited(QV1_DOWNLOADS_PER_HOUR - 1)).toBe(false);
    expect(isQv1DownloadRateLimited(QV1_DOWNLOADS_PER_HOUR)).toBe(true);
  });
});

describe("planQv1Download", () => {
  it("pauses the file when downloads are disabled", async () => {
    const sign = vi.fn();
    const record = vi.fn();
    const decision = await planQv1Download({
      userId: "user-1",
      config,
      recentCount: 0,
      sign,
      record,
      enabled: false,
    });
    expect(decision).toEqual({ kind: "paused" });
    expect(sign).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(qv1DownloadLocation(decision)).toBe("/qv1?download=paused");
  });

  it("sends an anonymous visitor to sign in", async () => {
    const sign = vi.fn();
    const record = vi.fn();
    const decision = await planQv1Download({
      userId: null,
      config,
      recentCount: 0,
      sign,
      record,
    });
    expect(decision).toEqual({ kind: "login" });
    expect(sign).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(qv1DownloadLocation(decision)).toBe("/login?next=%2Fqv1%2Fdownload");
  });

  it("shows coming soon when R2 is not configured", async () => {
    const decision = await planQv1Download({
      userId: "user-1",
      config: null,
      recentCount: 0,
      sign: vi.fn(),
      record: vi.fn(),
    });
    expect(qv1DownloadLocation(decision)).toBe("/qv1?download=soon");
  });

  it("stops when the hourly cap is reached", async () => {
    const sign = vi.fn();
    const decision = await planQv1Download({
      userId: "user-1",
      config,
      recentCount: QV1_DOWNLOADS_PER_HOUR,
      sign,
      record: vi.fn(),
    });
    expect(decision.kind).toBe("limited");
    expect(sign).not.toHaveBeenCalled();
  });

  it("records the download and returns the presigned URL", async () => {
    const signed = "https://account.r2.cloudflarestorage.com/qv1-downloads/qv1/1.2.0/QV1-Setup-Evaluation.zip?X-Amz-Signature=test";
    const record = vi.fn(async () => undefined);
    const decision = await planQv1Download({
      userId: "user-1",
      config,
      recentCount: 1,
      sign: async (given) => {
        expect(given).toEqual(config);
        return signed;
      },
      record,
    });
    expect(decision).toEqual({ kind: "redirect", url: signed });
    expect(record).toHaveBeenCalledOnce();
  });

  it("still returns the presigned URL when the history insert fails", async () => {
    const report = vi.fn();
    const signed = "https://example.r2.cloudflarestorage.com/file";
    const decision = await planQv1Download({
      userId: "user-1",
      config,
      recentCount: 0,
      sign: async () => signed,
      record: async () => {
        throw new Error("relation qv1_downloads does not exist");
      },
      report,
    });
    expect(decision).toEqual({ kind: "redirect", url: signed });
    expect(report).toHaveBeenCalledOnce();
    expect(report.mock.calls[0][0]).toBe("record");
  });
});

describe("download logs", () => {
  it("names missing env vars and redacts long secrets", () => {
    expect(missingR2DownloadEnv({ R2_BUCKET: "qv1-downloads" })).toEqual([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "QV1_OBJECT_KEY",
    ]);
    const secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    const line = qv1DownloadLogLine("record", `insert failed token=${secret}`);
    expect(line.startsWith("[qv1-download] record:")).toBe(true);
    expect(line).not.toContain(secret);
    expect(line).toContain("[redacted]");
  });
});

describe("GET /qv1/download", () => {
  it("never starts the zip while downloads are paused", async () => {
    expect(QV1_DOWNLOAD_ENABLED).toBe(false);
    for (const [key, value] of Object.entries(fullEnv())) process.env[key] = value;
    vi.mocked(getRequestSupabaseSession).mockResolvedValue({
      client: {} as never,
      userId: "user-1",
    });

    const response = await GET(new Request("https://getqvi.com/qv1/download"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://getqvi.com/qv1?download=paused");
    expect(getRequestSupabaseSession).not.toHaveBeenCalled();
  });
});
