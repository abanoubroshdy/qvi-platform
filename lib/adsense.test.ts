import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADSENSE_FILL_TIMEOUT_MS,
  DEFAULT_ADSENSE_CLIENT,
  DEFAULT_ADSENSE_SLOT,
  adsenseScriptSrc,
  adsenseVerificationClient,
  hasOnlyCollapsedFrames,
  isBrokenAdImage,
  judgeAdFill,
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

describe("judgeAdFill", () => {
  const pending = {
    adStatus: null,
    scriptStatus: null,
    elapsedMs: 0,
  };

  it("keeps a fresh request reserved", () => {
    expect(judgeAdFill(pending)).toBe("pending");
    expect(judgeAdFill({ ...pending, elapsedMs: ADSENSE_FILL_TIMEOUT_MS - 1 })).toBe("pending");
  });

  it("collapses when nothing has filled by the timeout", () => {
    expect(judgeAdFill({ ...pending, elapsedMs: ADSENSE_FILL_TIMEOUT_MS })).toBe("hidden");
    expect(judgeAdFill({ ...pending, elapsedMs: ADSENSE_FILL_TIMEOUT_MS + 50 })).toBe("hidden");
  });

  it("shows the unit only when AdSense marks it filled", () => {
    expect(judgeAdFill({ ...pending, adStatus: " filled " })).toBe("filled");
    expect(
      judgeAdFill({
        ...pending,
        adStatus: "filled",
        elapsedMs: ADSENSE_FILL_TIMEOUT_MS + 1,
        pushFailed: true,
        brokenImage: true,
        emptyFrame: true,
      }),
    ).toBe("filled");
  });

  it("collapses unfilled, errored, blocked, and broken slots immediately", () => {
    expect(judgeAdFill({ ...pending, adStatus: "unfilled" })).toBe("hidden");
    expect(judgeAdFill({ ...pending, adStatus: "error" })).toBe("hidden");
    expect(judgeAdFill({ ...pending, scriptStatus: "ERROR" })).toBe("hidden");
    expect(judgeAdFill({ ...pending, pushFailed: true })).toBe("hidden");
    expect(judgeAdFill({ ...pending, brokenImage: true })).toBe("hidden");
  });

  it("collapses a finished request whose frames are empty, and waits while frames are still loading", () => {
    expect(judgeAdFill({ ...pending, scriptStatus: "done", emptyFrame: true })).toBe("hidden");
    expect(judgeAdFill({ ...pending, scriptStatus: null, emptyFrame: true })).toBe("pending");
    expect(judgeAdFill({ ...pending, scriptStatus: "done", emptyFrame: false })).toBe("pending");
  });
});

describe("unfilled creative signals", () => {
  it("treats a large decoded-empty image as the broken icon box", () => {
    expect(
      isBrokenAdImage({ complete: true, naturalWidth: 0, boxWidth: 300, boxHeight: 250 }),
    ).toBe(true);
    expect(
      isBrokenAdImage({ complete: false, naturalWidth: 0, boxWidth: 300, boxHeight: 250 }),
    ).toBe(false);
    expect(
      isBrokenAdImage({ complete: true, naturalWidth: 300, boxWidth: 300, boxHeight: 250 }),
    ).toBe(false);
    expect(isBrokenAdImage({ complete: true, naturalWidth: 0, boxWidth: 1, boxHeight: 1 })).toBe(false);
  });

  it("treats only collapsed frames as empty, not a missing frame", () => {
    expect(hasOnlyCollapsedFrames([])).toBe(false);
    expect(hasOnlyCollapsedFrames([{ width: 0, height: 0, hidden: false }])).toBe(true);
    expect(hasOnlyCollapsedFrames([{ width: 300, height: 250, hidden: true }])).toBe(true);
    expect(hasOnlyCollapsedFrames([{ width: 300, height: 250, hidden: false }])).toBe(false);
  });
});

describe("tool ad markup", () => {
  it("covers the slot until fill and collapses unfilled units without enabling auto ads", () => {
    const component = readFileSync(new URL("../components/ToolAd.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("judgeAdFill");
    expect(component).toContain("qvi-ad-mask");
    expect(component).toContain("bg-background");
    expect(component).toContain("height: 0, minHeight: 0");
    expect(component).not.toContain("data-ad-format");
    expect(component).not.toContain("enable_page_level_ads");
    expect(css).toContain('.qvi-ad-slot:has(.adsbygoogle[data-ad-status="unfilled"])');
    expect(css).toContain("display: none !important");
    expect(css).toContain(".qvi-ad-mask");
  });
});

describe("ads.txt", () => {
  it("lists the default publisher as a direct Google seller", () => {
    const text = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8").trim();
    expect(text).toBe("google.com, pub-9019451998006609, DIRECT, f08c47fec0942fa0");
  });
});
