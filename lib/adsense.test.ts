import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADSENSE_CLIENT,
  DEFAULT_ADSENSE_SLOT,
  adsenseScriptSrc,
  adsenseVerificationClient,
  resolveAdSensePlacement,
} from "@/lib/adsense";

const cleared = {
  NEXT_PUBLIC_ADSENSE_CLIENT: undefined,
  NEXT_PUBLIC_ADSENSE_SLOT: undefined,
  NEXT_PUBLIC_ADSENSE_SLOT_TOP: undefined,
  NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM: undefined,
};

describe("resolveAdSensePlacement", () => {
  it("defaults to the known publisher and a single top slot", () => {
    expect(resolveAdSensePlacement(cleared)).toEqual({
      client: DEFAULT_ADSENSE_CLIENT,
      topSlot: DEFAULT_ADSENSE_SLOT,
      bottomSlot: "",
    });
  });

  it("renders nothing when the client or slot is blank", () => {
    expect(
      resolveAdSensePlacement({
        ...cleared,
        NEXT_PUBLIC_ADSENSE_CLIENT: "  ",
      }),
    ).toEqual({ client: "", topSlot: "", bottomSlot: "" });

    expect(
      resolveAdSensePlacement({
        ...cleared,
        NEXT_PUBLIC_ADSENSE_SLOT: "",
        NEXT_PUBLIC_ADSENSE_SLOT_TOP: "",
      }),
    ).toEqual({ client: "", topSlot: "", bottomSlot: "" });
  });

  it("ignores a bottom slot that repeats the top slot", () => {
    expect(
      resolveAdSensePlacement({
        ...cleared,
        NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM: DEFAULT_ADSENSE_SLOT,
      }),
    ).toEqual({
      client: DEFAULT_ADSENSE_CLIENT,
      topSlot: DEFAULT_ADSENSE_SLOT,
      bottomSlot: "",
    });
  });

  it("places a distinct bottom slot under the top unit", () => {
    expect(
      resolveAdSensePlacement({
        ...cleared,
        NEXT_PUBLIC_ADSENSE_SLOT_TOP: "111",
        NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM: "222",
      }),
    ).toEqual({
      client: DEFAULT_ADSENSE_CLIENT,
      topSlot: "111",
      bottomSlot: "222",
    });
  });
});

describe("adsense script", () => {
  it("loads the manual display loader and does not enable page-level ads", () => {
    const src = adsenseScriptSrc(DEFAULT_ADSENSE_CLIENT);
    expect(src).toBe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
    expect(src).not.toContain("client=");
    expect(src).not.toContain("enable_page_level_ads");
  });

  it("keeps the verification client when ad units are disabled", () => {
    expect(adsenseVerificationClient({ NEXT_PUBLIC_ADSENSE_CLIENT: "" })).toBe(DEFAULT_ADSENSE_CLIENT);
    expect(adsenseVerificationClient({ NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-123" })).toBe("ca-pub-123");
  });
});

describe("ads.txt", () => {
  it("lists the default publisher as a direct Google seller", () => {
    const text = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8").trim();
    expect(text).toBe("google.com, pub-9019451998006609, DIRECT, f08c47fec0942fa0");
  });
});
