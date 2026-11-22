import { describe, expect, it } from "vitest";
import {
  CF_BEACON_SCRIPT_SRC,
  buildCfBeaconDataAttribute,
  resolveCfBeaconToken,
} from "./cloudflare-web-analytics";

describe("cloudflare web analytics beacon", () => {
  it("resolves token from NEXT_PUBLIC_CF_BEACON_TOKEN", () => {
    expect(resolveCfBeaconToken({ NEXT_PUBLIC_CF_BEACON_TOKEN: "  abc  " })).toBe("abc");
    expect(resolveCfBeaconToken({})).toBe("");
  });

  it("builds data-cf-beacon JSON", () => {
    expect(buildCfBeaconDataAttribute("token-1")).toBe('{"token":"token-1"}');
  });

  it("uses the official beacon script URL", () => {
    expect(CF_BEACON_SCRIPT_SRC).toBe("https://static.cloudflareinsights.com/beacon.min.js");
  });
});