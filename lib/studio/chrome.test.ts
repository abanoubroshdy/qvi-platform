import { describe, expect, it } from "vitest";
import {
  commitSessionBpmText,
  formatSessionBpm,
  formatStudioTimecode,
  isStudioTextTarget,
  nudgeSessionBpm,
  readSessionBpm,
  sanitizeSessionBpmDraft,
  sessionDisplayBpm,
  studioNewProjectButtonPhase,
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

  it("edits session bpm without reading a track tempo", () => {
    expect(readSessionBpm(undefined)).toBe(120);
    expect(readSessionBpm({})).toBe(120);
    expect(commitSessionBpmText("92.5", 120)).toBe(92.5);
    expect(commitSessionBpmText("92,5", 120)).toBe(92.5);
    expect(commitSessionBpmText("", 128)).toBe(128);
    expect(commitSessionBpmText("nope", 100)).toBe(100);
    expect(commitSessionBpmText("10", 120)).toBe(20);
    expect(commitSessionBpmText("900", 120)).toBe(300);
    expect(nudgeSessionBpm(120, 1, false)).toBe(121);
    expect(nudgeSessionBpm(120, -1, true)).toBe(119.9);
    expect(nudgeSessionBpm(20, -4, false)).toBe(20);
    expect(nudgeSessionBpm(300, 2, false)).toBe(300);
    expect(sanitizeSessionBpmDraft("92.5bpm")).toBe("92.5");
    expect(formatSessionBpm(92.5)).toBe("92.5");
    expect(readSessionBpm({ sessionBpm: 140 })).toBe(140);
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

  it("shows New on empty sessions and Clear then Confirm when open", () => {
    expect(studioNewProjectButtonPhase(false, false)).toBe("new");
    expect(studioNewProjectButtonPhase(false, true)).toBe("new");
    expect(studioNewProjectButtonPhase(true, false)).toBe("clear");
    expect(studioNewProjectButtonPhase(true, true)).toBe("confirm");
  });
});
