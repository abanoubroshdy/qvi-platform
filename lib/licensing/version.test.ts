import { describe, expect, it } from "vitest";
import { compareVersions, isNewerVersion } from "@/lib/licensing/version";

describe("isNewerVersion", () => {
  it("compares dotted core versions", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
    expect(isNewerVersion("2.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("orders pre-release builds on the same core version", () => {
    expect(isNewerVersion("0.0.2-beta.1", "0.0.2-beta")).toBe(true);
    expect(isNewerVersion("0.0.2-beta.2", "0.0.2-beta.1")).toBe(true);
    expect(isNewerVersion("0.0.2-rc.1", "0.0.2-beta.2")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.0-beta")).toBe(true);
    expect(isNewerVersion("1.0.0-beta", "1.0.0")).toBe(false);
  });

  it("compares core version before pre-release", () => {
    expect(isNewerVersion("0.0.2-beta", "0.0.1-beta")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.0.2-rc.1")).toBe(true);
  });

  it("compares numeric and alphanumeric pre-release identifiers", () => {
    expect(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.1")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0-alpha.beta", "1.0.0-alpha.1")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.beta")).toBeLessThan(0);
  });

  it("ignores build metadata after +", () => {
    expect(isNewerVersion("1.0.1+build.1", "1.0.0+build.99")).toBe(true);
    expect(compareVersions("1.0.0+foo", "1.0.0+bar")).toBe(0);
  });

  it("covers the documented pre-release ordering chain", () => {
    const chain = [
      "0.0.1-beta",
      "0.0.2-beta",
      "0.0.2-beta.1",
      "0.0.2-beta.2",
      "0.0.2-rc.1",
      "1.0.0",
    ];
    for (let i = 0; i < chain.length - 1; i += 1) {
      expect(isNewerVersion(chain[i + 1]!, chain[i]!)).toBe(true);
      expect(isNewerVersion(chain[i]!, chain[i + 1]!)).toBe(false);
    }
  });
});