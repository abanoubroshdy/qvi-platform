import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/qv1/download/route";
import { QV1_DOWNLOAD_SOON_PATH, resolveQv1DownloadRedirect } from "@/lib/qv1-download";

const ORIGINAL = process.env.QV1_DOWNLOAD_URL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QV1_DOWNLOAD_URL;
  else process.env.QV1_DOWNLOAD_URL = ORIGINAL;
});

describe("resolveQv1DownloadRedirect", () => {
  it("sends an unset variable back to the coming-soon page", () => {
    expect(resolveQv1DownloadRedirect(undefined)).toEqual({
      location: QV1_DOWNLOAD_SOON_PATH,
      status: 307,
    });
    expect(resolveQv1DownloadRedirect("   ")).toEqual({
      location: QV1_DOWNLOAD_SOON_PATH,
      status: 307,
    });
    expect(resolveQv1DownloadRedirect(null)).toEqual({
      location: QV1_DOWNLOAD_SOON_PATH,
      status: 307,
    });
  });

  it("redirects to the configured URL without inventing one", () => {
    const location = "https://github.com/example/qv1/releases/download/v1.2.0/QV1-Evaluation.exe";
    expect(resolveQv1DownloadRedirect(`  ${location}  `)).toEqual({
      location,
      status: 307,
    });
  });
});

describe("GET /qv1/download", () => {
  it("redirects to QV1_DOWNLOAD_URL when set", async () => {
    const location = "https://github.com/example/qv1/releases/download/v1.2.0/QV1-Evaluation.exe";
    process.env.QV1_DOWNLOAD_URL = location;
    const response = await GET(new Request("https://getqvi.com/qv1/download"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(location);
  });

  it("redirects to /qv1?download=soon when the variable is unset", async () => {
    delete process.env.QV1_DOWNLOAD_URL;
    const response = await GET(new Request("https://getqvi.com/qv1/download"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://getqvi.com/qv1?download=soon");
  });
});
