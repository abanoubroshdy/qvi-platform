import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/qv1/download/route";
import {
  QV1_DEFAULT_OBJECT_KEY,
  QV1_DOWNLOAD_ENABLED,
  QV1_DOWNLOADS_PER_HOUR,
  contentDispositionAttachment,
  isQv1DownloadRateLimited,
  claimQv1Autostart,
  createQv1AutostartToken,
  isQv1AutostartConsumed,
  isQv1AutostartToken,
  isQv1DownloadNextPath,
  loginPathForDownload,
  missingR2DownloadEnv,
  planQv1Download,
  postAuthPath,
  qv1AutostartPath,
  qv1AutostartTokenFromQuery,
  qv1DownloadLocation,
  qv1DownloadLogLine,
  resolveR2DownloadConfig,
  safeNextPath,
  withoutQv1Autostart,
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
  objectKey: "qv1/evaluation/QV1-Setup-Evaluation.exe",
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

  it("reads the server variables and ignores a leftover public URL", () => {
    expect(resolveR2DownloadConfig({ ...fullEnv(), QV1_DOWNLOAD_URL: "https://dl.getqvi.com/file.zip" })).toEqual(
      config,
    );
  });

  it("defaults the object key to the online Setup", () => {
    const env = fullEnv();
    delete (env as { QV1_OBJECT_KEY?: string }).QV1_OBJECT_KEY;
    expect(resolveR2DownloadConfig(env)).toEqual({ ...config, objectKey: QV1_DEFAULT_OBJECT_KEY });
    expect(QV1_DEFAULT_OBJECT_KEY).toBe("qv1/evaluation/QV1-Setup-Evaluation.exe");
    expect(resolveR2DownloadConfig({ ...env, QV1_OBJECT_KEY: "  custom/key.exe  " })?.objectKey).toBe("custom/key.exe");
  });
});

const AUTOSTART = "aaaaaaaaaaaaaaaaaaaaaa";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("download guards", () => {
  it("keeps the return path on this site", () => {
    expect(safeNextPath("/qv1/download")).toBe("/qv1/download");
    expect(safeNextPath("/qv1?autostart=aaaaaaaaaaaaaaaaaaaaaa")).toBe("/qv1?autostart=aaaaaaaaaaaaaaaaaaaaaa");
    expect(safeNextPath("https://evil.example/steal")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(loginPathForDownload(AUTOSTART)).toBe(
      `/login?next=${encodeURIComponent(qv1AutostartPath(AUTOSTART))}`,
    );
    expect(loginPathForDownload(AUTOSTART)).not.toContain("qv1%2Fdownload");
  });

  it("sets an attachment filename and a per-hour cap", () => {
    expect(contentDispositionAttachment("QV1-Setup-Evaluation.exe")).toBe(
      'attachment; filename="QV1-Setup-Evaluation.exe"',
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
    const location = qv1DownloadLocation(decision);
    const next = new URL(location, "https://getqvi.com").searchParams.get("next");
    expect(next?.startsWith("/qv1?autostart=")).toBe(true);
    expect(isQv1DownloadNextPath(next ?? "")).toBe(false);
    expect(isQv1AutostartToken(new URL(next ?? "", "https://getqvi.com").searchParams.get("autostart"))).toBe(true);
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
    const signed = "https://account.r2.cloudflarestorage.com/qv1-downloads/qv1/evaluation/QV1-Setup-Evaluation.exe?X-Amz-Signature=test";
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

describe("post-login download landing", () => {
  it("sends auth back to /qv1 instead of the file route", () => {
    expect(postAuthPath("/qv1/download", AUTOSTART)).toBe(qv1AutostartPath(AUTOSTART));
    expect(postAuthPath("/qv1/download?unused=1", AUTOSTART)).toBe(qv1AutostartPath(AUTOSTART));
    expect(postAuthPath("/qv1/download#file", AUTOSTART)).toBe(qv1AutostartPath(AUTOSTART));
    expect(postAuthPath(qv1AutostartPath(AUTOSTART))).toBe(qv1AutostartPath(AUTOSTART));
    expect(postAuthPath("/account")).toBe("/account");
    expect(postAuthPath("/qv1?download=soon")).toBe("/qv1?download=soon");
    expect(postAuthPath("https://evil.example/qv1/download")).toBe("/account");
    expect(postAuthPath("//evil.example/qv1/download")).toBe("/account");
    expect(isQv1DownloadNextPath("/qv1/download")).toBe(true);
    expect(isQv1DownloadNextPath("/qv1/downloads")).toBe(false);
  });

  it("accepts only same-origin one-shot tokens", () => {
    expect(isQv1AutostartToken(AUTOSTART)).toBe(true);
    expect(createQv1AutostartToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(qv1AutostartTokenFromQuery(AUTOSTART)).toBe(AUTOSTART);
    expect(qv1AutostartTokenFromQuery([AUTOSTART, "other"])).toBe(AUTOSTART);
    expect(qv1AutostartTokenFromQuery("soon")).toBeNull();
    expect(qv1AutostartTokenFromQuery("https://evil.example")).toBeNull();
    expect(qv1AutostartTokenFromQuery("../account")).toBeNull();
    expect(withoutQv1Autostart(`https://getqvi.com/qv1?autostart=${AUTOSTART}`)).toBe("/qv1");
    expect(withoutQv1Autostart(`https://getqvi.com/ar/qv1?autostart=${AUTOSTART}&download=soon`)).toBe(
      "/ar/qv1?download=soon",
    );
  });

  it("starts a token once and ignores refresh or a second claim", () => {
    const storage = memoryStorage();
    const seen = new Set<string>();
    expect(claimQv1Autostart(AUTOSTART, storage, seen)).toBe("start");
    expect(isQv1AutostartConsumed(AUTOSTART, storage)).toBe(true);
    expect(claimQv1Autostart(AUTOSTART, storage, seen)).toBe("repeat");
    expect(claimQv1Autostart(AUTOSTART, storage, new Set())).toBe("done");
    const other = createQv1AutostartToken();
    expect(claimQv1Autostart(other, storage, seen)).toBe("start");
    expect(claimQv1Autostart("not-a-token", storage, seen)).toBe("done");
  });
});

describe("download logs", () => {
  it("names missing env vars and redacts long secrets", () => {
    expect(missingR2DownloadEnv({ R2_BUCKET: "qv1-downloads" })).toEqual([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
    ]);
    const secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    const line = qv1DownloadLogLine("record", `insert failed token=${secret}`);
    expect(line.startsWith("[qv1-download] record:")).toBe(true);
    expect(line).not.toContain(secret);
    expect(line).toContain("[redacted]");
  });
});

describe("GET /qv1/download", () => {
  it("redirects an anonymous request to login with a return path", async () => {
    expect(QV1_DOWNLOAD_ENABLED).toBe(true);
    vi.mocked(getRequestSupabaseSession).mockResolvedValue(null);
    const response = await GET(new Request("https://getqvi.com/qv1/download"));
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    const next = new URL(location).searchParams.get("next");
    expect(location.startsWith("https://getqvi.com/login?next=")).toBe(true);
    expect(next?.startsWith("/qv1?autostart=")).toBe(true);
    expect(postAuthPath(next)).toBe(next);
    expect(isQv1DownloadNextPath(next ?? "")).toBe(false);
  });

  it("signs the default Setup key and records the download", async () => {
    const env = fullEnv();
    delete (env as { QV1_OBJECT_KEY?: string }).QV1_OBJECT_KEY;
    for (const [key, value] of Object.entries(env)) process.env[key] = value;
    delete process.env.QV1_OBJECT_KEY;
    vi.mocked(getRequestSupabaseSession).mockResolvedValue({
      client: {} as never,
      userId: "user-1",
    });

    const response = await GET(new Request("https://getqvi.com/qv1/download"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location.startsWith("https://")).toBe(true);
    expect(location).toContain("qv1/evaluation/QV1-Setup-Evaluation.exe");
    expect(location).toContain("QV1-Setup-Evaluation.exe");
    expect(insertQv1Download).toHaveBeenCalledOnce();
    expect(countRecentQv1Downloads).toHaveBeenCalledOnce();
  });

  it("sends a signed-in user to the presigned file even when history writes fail", async () => {
    for (const [key, value] of Object.entries(fullEnv())) process.env[key] = value;
    vi.mocked(getRequestSupabaseSession).mockResolvedValue({
      client: {} as never,
      userId: "user-1",
    });
    vi.mocked(countRecentQv1Downloads).mockRejectedValue(new Error("relation qv1_downloads does not exist"));
    vi.mocked(insertQv1Download).mockRejectedValue(new Error("relation qv1_downloads does not exist"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("https://getqvi.com/qv1/download"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location.startsWith("https://")).toBe(true);
    expect(location).toContain("QV1-Setup-Evaluation.exe");
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("[qv1-download] history count:");
    expect(logged).toContain("[qv1-download] record:");
    expect(logged).not.toContain(fullEnv().R2_SECRET_ACCESS_KEY);
    errorSpy.mockRestore();
  });

  it("returns a signed-in user to /qv1 with a visible error when R2 is not configured", async () => {
    vi.mocked(getRequestSupabaseSession).mockResolvedValue({
      client: {} as never,
      userId: "user-1",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("https://getqvi.com/qv1/download"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://getqvi.com/qv1?download=soon");
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("R2_SECRET_ACCESS_KEY");
    expect(logged).not.toMatch(/secret-value|wJalr/);
    errorSpy.mockRestore();
  });
});
