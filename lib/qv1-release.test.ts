import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { ar } from "@/lib/i18n/ar";
import { en } from "@/lib/i18n/en";
import { qv1AppCopyright, qv1Dependencies, qv1ModelSources } from "@/lib/qv1-models";
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
  it("hides an empty size and an empty hash", () => {
    expect(qv1HasFileSize(qv1Release)).toBe(false);
    expect(qv1HasSha256(qv1Release)).toBe(false);
    expect(qv1DownloadSummary(qv1Release, (bytes) => `${bytes} B`)).toBe("v1.2.0 · Windows 10/11 x64");
  });

  it("includes size and hash only when they are present", () => {
    const release = { ...qv1Release, fileSizeBytes: 90_000_000, sha256: "abc123" };
    expect(qv1HasFileSize(release)).toBe(true);
    expect(qv1HasSha256(release)).toBe(true);
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
    expect(en.qv1Page.proTitle).toMatch(/Pro/);
    expect(ar.qv1Page.stemsTitle).toContain("4");
    expect(ar.qv1Page.proTitle).toMatch(/Pro/);
  });

  it("does not place ad units on /qv1 routes", () => {
    const qv1 = `${readTree("app/qv1")}\n${readTree("components/qv1")}`;
    expect(qv1).not.toMatch(/ToolAd|AdSenseScript|adsbygoogle|ca-pub-/);
    expect(qv1.length).toBeGreaterThan(0);
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
