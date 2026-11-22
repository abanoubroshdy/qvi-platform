import { describe, expect, it } from "vitest";
import { formatLicenseKey, generateLicenseKey, hashLicenseKey, normalizeLicenseKey } from "@/lib/licensing/license-key";

describe("license-key", () => {
  it("normalizes dashes and spaces", () => {
    expect(normalizeLicenseKey("abcd-efgh")).toBe("ABCDEFGH");
  });

  it("hashes consistently", async () => {
    const a = await hashLicenseKey("ABCD-EFGH");
    const b = await hashLicenseKey("abcdefgh");
    expect(a).toBe(b);
  });

  it("formats generated keys", () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/);
    expect(formatLicenseKey(key)).toBe(key);
  });
});