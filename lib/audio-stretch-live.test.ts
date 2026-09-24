import { describe, expect, it } from "vitest";
import { liveStretchParams } from "@/lib/audio-stretch-live";

describe("live stretch parameters", () => {
  it("maps music to realtime WSOLA windows and a unity pitch", () => {
    expect(liveStretchParams({ tempoRate: 1, semitones: 0, cents: 0, preset: "music" })).toEqual({
      playbackRate: 1,
      pitch: 1,
      pitchSemitones: 0,
      stretch: { sequenceMs: 0, seekWindowMs: 0, overlapMs: 12, quickSeek: false },
    });
  });

  it("keeps tempo on the playback rate and pitch on semitones plus cents", () => {
    const params = liveStretchParams({ tempoRate: 2, semitones: 3, cents: 50, preset: "music" });
    expect(params.playbackRate).toBe(2);
    expect(params.pitch).toBe(1);
    expect(params.pitchSemitones).toBeCloseTo(3.5, 5);
  });

  it("maps speech and solo vocal onto their WSOLA presets", () => {
    expect(liveStretchParams({ tempoRate: 1, semitones: 0, cents: 0, preset: "speech" }).stretch).toEqual({
      sequenceMs: 40,
      seekWindowMs: 15,
      overlapMs: 8,
      quickSeek: true,
    });
    expect(liveStretchParams({ tempoRate: 0.5, semitones: -2, cents: 0, preset: "solo-vocal" }).stretch).toEqual({
      sequenceMs: 60,
      seekWindowMs: 20,
      overlapMs: 12,
      quickSeek: false,
    });
  });

  it("clamps to the worklet AudioParam range", () => {
    const slow = liveStretchParams({ tempoRate: 0.01, semitones: -40, cents: 0 });
    const fast = liveStretchParams({ tempoRate: 20, semitones: 30, cents: 0 });
    expect(slow.playbackRate).toBe(0.1);
    expect(slow.pitchSemitones).toBe(-24);
    expect(fast.playbackRate).toBe(8);
    expect(fast.pitchSemitones).toBe(24);
  });
});
