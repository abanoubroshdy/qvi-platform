import { describe, expect, it } from "vitest";
import {
  formatStudioTimecode,
  isStudioTextTarget,
  sessionDisplayBpm,
  studioProjectIsOpen,
  studioTransportCommand,
} from "@/lib/studio/chrome";

const unity = { mode: "bpm" as const, originalBpm: 120, targetBpm: 120, percent: 0 };

describe("studio transport keys", () => {
  it("maps space, home, and arrows, and ignores modified or repeated transport keys", () => {
    expect(studioTransportCommand({ key: " ", code: "Space" })).toEqual({ action: "play-pause" });
    expect(studioTransportCommand({ key: "Home" })).toEqual({ action: "stop" });
    expect(studioTransportCommand({ key: "ArrowLeft" })).toEqual({ action: "seek", deltaSec: -1 });
    expect(studioTransportCommand({ key: "ArrowRight", shiftKey: true })).toEqual({ action: "seek", deltaSec: 5 });
    expect(studioTransportCommand({ key: " ", code: "Space", repeat: true })).toBeNull();
    expect(studioTransportCommand({ key: "Home", metaKey: true })).toBeNull();
    expect(studioTransportCommand({ key: "ArrowRight", ctrlKey: true })).toBeNull();
    expect(studioTransportCommand({ key: "a" })).toBeNull();
  });

  it("skips text fields and still allows buttons", () => {
    expect(isStudioTextTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isStudioTextTarget({ tagName: "textarea" } as unknown as EventTarget)).toBe(true);
    expect(isStudioTextTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(isStudioTextTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isStudioTextTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isStudioTextTarget(null)).toBe(false);
  });
});

describe("studio timecode and bpm", () => {
  it("shows tenths and clamps invalid times", () => {
    expect(formatStudioTimecode(0)).toBe("00:00.0");
    expect(formatStudioTimecode(61.24)).toBe("01:01.2");
    expect(formatStudioTimecode(Number.NaN)).toBe("00:00.0");
    expect(formatStudioTimecode(-2)).toBe("00:00.0");
  });

  it("hides bpm until a track exists, then uses the selected track", () => {
    expect(sessionDisplayBpm([], null)).toBeNull();
    const tracks = [
      { id: "a", tempo: unity },
      { id: "b", tempo: { mode: "percent" as const, originalBpm: 100, targetBpm: 100, percent: 50 } },
    ];
    expect(sessionDisplayBpm(tracks, null)).toBe(120);
    expect(sessionDisplayBpm(tracks, "b")).toBe(150);
  });

  it("treats a session as open only when it has tracks", () => {
    expect(studioProjectIsOpen({ tracks: [] })).toBe(false);
    expect(studioProjectIsOpen({ tracks: [{ id: "a" }] })).toBe(true);
  });
});
