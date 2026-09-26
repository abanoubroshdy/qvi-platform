import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { ar } from "@/lib/i18n/ar";
import { en } from "@/lib/i18n/en";
import nextConfig from "../next.config.mjs";
import { qv1AppCopyright, qv1Dependencies, qv1ModelSources } from "@/lib/qv1-models";
import { QV1_DOWNLOAD_ENABLED } from "@/lib/qv1-download";
import { formatBytes } from "@/lib/format";
import { qv1DownloadSummary, qv1HasFileSize, qv1HasSha256, qv1Release } from "@/lib/qv1-release";
import { siteConfig } from "@/lib/site";

const forbiddenStemCount = /(?:\b7\b|\bseven\b|سبعة|٧)\s*(?:ai\s*)?(?:stems?|tracks?|ستيم|ستيمز|مسار|مسارات)/i;

function readTree(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return [readTree(full)];
      if (!/\.(tsx?|md|json)$/.test(entry.name) || entry.name.includes(".test.")) return [];
      return [fs.readFileSync(full, "utf8")];
    })
    .join("\n");
}

describe("QV1 release record", () => {
  it("publishes the Evaluation Setup name and size", () => {
    expect(qv1Release.version).toBe("1.2.0");
    expect(qv1Release.fileName).toBe("QV1-Setup-Evaluation.exe");
    expect(qv1Release.fileSizeBytes).toBe(177_766_232);
    expect(qv1Release.sha256).toBe("");
    expect(qv1HasFileSize(qv1Release)).toBe(true);
    expect(qv1HasSha256(qv1Release)).toBe(false);
    expect(qv1DownloadSummary(qv1Release, formatBytes)).toBe("v1.2.0 · 169.5 MB · Windows 10/11 x64");
  });

  it("hides an empty size and an empty hash", () => {
    const empty = { ...qv1Release, fileSizeBytes: null, sha256: "" };
    expect(qv1HasFileSize(empty)).toBe(false);
    expect(qv1HasSha256(empty)).toBe(false);
    expect(qv1DownloadSummary(empty, (bytes) => `${bytes} B`)).toBe("v1.2.0 · Windows 10/11 x64");
  });

  it("includes size and hash only when they are present", () => {
    const release = { ...qv1Release, fileSizeBytes: 90_000_000, sha256: "abc123" };
    expect(qv1DownloadSummary(release, () => "85.8 MB")).toBe("v1.2.0 · 85.8 MB · Windows 10/11 x64");
  });
});

describe("QV1 public copy", () => {
  const surfaces = [
    fs.readFileSync("lib/i18n/en.ts", "utf8"),
    fs.readFileSync("lib/i18n/ar.ts", "utf8"),
    fs.readFileSync("lib/products.ts", "utf8"),
    fs.readFileSync("lib/site.ts", "utf8"),
    fs.readFileSync("README.md", "utf8"),
    readTree("app"),
    readTree("components"),
    readTree("lib"),
  ].join("\n");

  it("does not claim 7 stems or 7 tracks for QV1", () => {
    expect(surfaces).not.toMatch(forbiddenStemCount);
    expect(en.qv1Page.stemsTitle).toContain("4 AI stems");
    expect(en.qv1Page.proTitle).toMatch(/Drum Split \(DSP\)/);
    expect(en.qv1Page.proTitle).toMatch(/free \(Evaluation\)/);
    expect(en.qv1Page.lead).toMatch(/whole app is free/i);
    expect(ar.qv1Page.stemsTitle).toContain("4");
    expect(ar.qv1Page.proTitle).toMatch(/مجانًا/);
    expect(ar.qv1Page.lead).toMatch(/بالكامل مجاني/);
    const qv1Copy = JSON.stringify({
      enPage: en.qv1Page,
      arPage: ar.qv1Page,
      enProduct: en.products.qv1,
      arProduct: ar.products.qv1,
    });
    expect(qv1Copy).not.toMatch(/\bPro\b/);
  });

  it("does not place ad units on /qv1 routes", () => {
    const qv1 = `${readTree("app/qv1")}\n${readTree("components/qv1")}`;
    expect(qv1).not.toMatch(/ToolAd|AdSenseScript|adsbygoogle|ca-pub-/);
    expect(qv1.length).toBeGreaterThan(0);
  });

  it("offers one signed-in Setup download and no ad units", () => {
    expect(QV1_DOWNLOAD_ENABLED).toBe(true);
    expect(en.qv1Page.download).toBe("Download Setup");
    expect(ar.qv1Page.download).toBe("حمّل Setup");
    expect(en.qv1Page.downloadStarted).toMatch(/download has started/i);
    expect(en.qv1Page.downloadFallback).toMatch(/click here/i);
    expect(ar.qv1Page.downloadStarted).toMatch(/التحميل/);
    expect(ar.qv1Page.downloadFallback).toMatch(/هنا/);
    expect(en.qv1Page.setupNote).toMatch(/GPU/i);
    expect(en.qv1Page.setupNote).toMatch(/675/);
    expect(en.qv1Page.setupNote).toMatch(/CUDA/);
    expect(en.qv1Page.setupNote).toMatch(/Windows/);
    expect(ar.qv1Page.setupNote).toMatch(/675/);
    expect(ar.qv1Page.setupNote).toMatch(/CUDA/);
    expect(ar.qv1Page.setupNote).toMatch(/ويندوز/);
    const view = fs.readFileSync("components/qv1/Qv1EvaluationView.tsx", "utf8");
    const notice = fs.readFileSync("components/qv1/Qv1AutostartNotice.tsx", "utf8");
    expect(view).toMatch(/href="\/qv1\/download"/);
    expect(view).toContain("Qv1AutostartNotice");
    expect(notice).toContain('lang="en"');
    expect(notice).toContain('lang="ar"');
    expect(notice).toContain('dir="rtl"');
    expect(notice).toContain("QV1_DOWNLOAD_PATH");
    expect(notice).not.toMatch(/ToolAd|AdSenseScript|adsbygoogle/);
    expect(view).toMatch(/page\.setupNote/);
    expect(view).not.toMatch(/extractNote|ToolAd|AdSenseScript/);
    expect(surfaces).not.toMatch(/QV1-Setup-Evaluation\.zip|4\.3 GB|\.bin slices|three \.bin/);
  });

  it("redirects installer payloads in public without an auth matcher", async () => {
    const redirects = await nextConfig.redirects();
    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source: "/downloads/evaluation/:path*",
          destination: "https://dl.getqvi.com/qv1/evaluation/:path*",
          permanent: false,
        },
      ]),
    );
    for (const file of [
      "middleware.ts",
      "middleware.js",
      "src/middleware.ts",
      "src/middleware.js",
      "proxy.ts",
      "src/proxy.ts",
    ]) {
      expect(fs.existsSync(file), file).toBe(false);
    }
  });

  it("lists /qv1 and /qv1/models on the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${siteConfig.url}/qv1`);
    expect(urls).toContain(`${siteConfig.url}/qv1/models`);
  });

  it("attributes the separation model and does not call it a QV1 original", () => {
    const model = qv1ModelSources[0];
    expect(model?.sourceUrl).toContain("ZFTurbo/Music-Source-Separation-Training");
    expect(model?.releaseUrl).toContain("v1.0.12");
    expect(model?.format).toBe("ONNX");
    expect(model?.name.toLowerCase()).not.toContain("original");
    expect(qv1Dependencies.map((item) => item.name)).toEqual([
      "ONNX Runtime",
      "NAudio",
      "NVIDIA CUDA redistributables",
    ]);
    expect(qv1AppCopyright).toEqual({ year: 2026, holder: "Abanoub Roshdy (QVI)" });
    expect(en.qv1Models.license).toContain("Non-commercial");
    expect(en.qv1Models.license).toContain("MUSDB18");
  });
});
