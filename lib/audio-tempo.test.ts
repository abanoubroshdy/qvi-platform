import { describe, expect, it } from "vitest";
import {
  appendTap,
  atempoFilter,
  bpmDelta,
  buildTempoPitchExportPlan,
  buildTempoPitchFilter,
  chainAtempoFactors,
  estimateOutputDuration,
  formatBpmDraft,
  parseBpmDraft,
  pitchRatio,
  resolveTempoRate,
  sanitizeBpmDraftInput,
  tapBpmFromTimestamps,
  tempoRateFromBpm,
  tempoRateFromPercent,
  totalCents,
} from "@/lib/audio-tempo";
import { defaultAudioExportSettings } from "@/lib/audio-export";

describe("BPM draft typing", () => {
  it("keeps intermediate digits like 1 and 10 without clamping to 40", () => {
    expect(sanitizeBpmDraftInput("1")).toBe("1");
    expect(sanitizeBpmDraftInput("10")).toBe("10");
    expect(sanitizeBpmDraftInput("106")).toBe("106");
    expect(parseBpmDraft("1")).toBe(40);
    expect(parseBpmDraft("106")).toBe(106);
    expect(parseBpmDraft("300")).toBe(240);
    expect(parseBpmDraft("")).toBeNull();
    expect(formatBpmDraft(120)).toBe("120");
    expect(formatBpmDraft(120.5)).toBe("120.5");
  });
});

describe("tempoRateFromBpm", () => {
  it("maps 100 → 120 to a 1.2× speed-up", () => {
    expect(tempoRateFromBpm(100, 120)).toBeCloseTo(1.2, 6);
    expect(bpmDelta(100, 120)).toBe(20);
  });

  it("maps 120 → 100 to a slowdown", () => {
    expect(tempoRateFromBpm(120, 100)).toBeCloseTo(100 / 120, 6);
  });
});

describe("tempoRateFromPercent", () => {
  it("maps +20% to 1.2 and −50% to 0.5", () => {
    expect(tempoRateFromPercent(20)).toBeCloseTo(1.2, 6);
    expect(tempoRateFromPercent(-50)).toBeCloseTo(0.5, 6);
  });
});

describe("chainAtempoFactors", () => {
  it("returns an empty list for unity tempo", () => {
    expect(chainAtempoFactors(1)).toEqual([]);
    expect(atempoFilter(1)).toBe("");
  });

  it("keeps a single factor inside 0.5–2", () => {
    expect(chainAtempoFactors(1.2)).toEqual([1.2]);
    expect(atempoFilter(1.2)).toBe("atempo=1.2");
  });

  it("daisy-chains factors whose product matches a rate of 3", () => {
    const factors = chainAtempoFactors(3);
    const product = factors.reduce((acc, value) => acc * value, 1);
    expect(product).toBeCloseTo(3, 6);
    expect(factors.every((factor) => factor >= 0.5 - 1e-9 && factor <= 2 + 1e-9)).toBe(true);
  });

  it("daisy-chains factors for a very slow rate", () => {
    const factors = chainAtempoFactors(0.25);
    const product = factors.reduce((acc, value) => acc * value, 1);
    expect(product).toBeCloseTo(0.25, 6);
  });
});

describe("pitchRatio", () => {
  it("is 2 for +12 semitones", () => {
    expect(pitchRatio(12, 0)).toBeCloseTo(2, 6);
  });

  it("uses cents for micro-tuning", () => {
    expect(pitchRatio(0, 50)).toBeCloseTo(2 ** (50 / 1200), 6);
    expect(totalCents(2, 25)).toBe(225);
    expect(pitchRatio(2, 25)).toBeCloseTo(2 ** (225 / 1200), 6);
  });

  it("handles the lower bound −12 st −50¢", () => {
    expect(pitchRatio(-12, -50)).toBeCloseTo(2 ** (-1250 / 1200), 6);
  });
});

describe("buildTempoPitchFilter", () => {
  it("uses atempo only when pitch is unchanged", () => {
    expect(buildTempoPitchFilter({ sampleRate: 44100, tempoRate: 1.2, semitones: 0, cents: 0 })).toBe(
      "atempo=1.2",
    );
  });

  it("pitches up an octave and restores duration when tempo is 1", () => {
    const filter = buildTempoPitchFilter({ sampleRate: 44100, tempoRate: 1, semitones: 12, cents: 0 });
    expect(filter).toContain("asetrate=");
    expect(filter).toContain("aresample=44100");
    expect(filter).toContain("atempo=0.5");
  });

  it("combines pitch and tempo into one atempo product", () => {
    // pitch ×2 then want tempo ×1.2 → combined atempo = 1.2/2 = 0.6
    const filter = buildTempoPitchFilter({ sampleRate: 48000, tempoRate: 1.2, semitones: 12, cents: 0 });
    expect(filter.startsWith("asetrate=")).toBe(true);
    expect(filter).toContain("aresample=48000");
    expect(filter).toContain("atempo=0.6");
  });

  it("returns an empty filter when nothing changes", () => {
    expect(buildTempoPitchFilter({ sampleRate: 44100, tempoRate: 1, semitones: 0, cents: 0 })).toBe("");
  });
});

describe("estimateOutputDuration", () => {
  it("shortens when speeding up and keeps length for pitch-only (tempo 1)", () => {
    expect(estimateOutputDuration(10, 1.2)).toBeCloseTo(10 / 1.2, 6);
    expect(estimateOutputDuration(10, 1)).toBe(10);
  });
});

describe("tap tempo", () => {
  it("estimates ~120 BPM from regular 500ms taps", () => {
    const taps = [0, 500, 1000, 1500, 2000];
    expect(tapBpmFromTimestamps(taps)).toBeCloseTo(120, 0);
  });

  it("needs at least three taps", () => {
    expect(tapBpmFromTimestamps([0, 500])).toBeNull();
  });

  it("resets after a long gap", () => {
    const afterGap = appendTap([0, 500, 1000], 1000 + 3000);
    expect(afterGap).toEqual([4000]);
  });
});

describe("resolveTempoRate", () => {
  it("picks bpm or percent mode", () => {
    expect(resolveTempoRate({ mode: "bpm", originalBpm: 100, targetBpm: 120, percent: 0 })).toBeCloseTo(1.2, 6);
    expect(resolveTempoRate({ mode: "percent", originalBpm: 100, targetBpm: 120, percent: -50 })).toBeCloseTo(0.5, 6);
  });
});

describe("buildTempoPitchExportPlan", () => {
  it("wires -af and estimates duration for a 100→120 BPM change", () => {
    const plan = buildTempoPitchExportPlan({
      inputName: "input.mp3",
      sourceDuration: 60,
      sampleRate: 44100,
      mode: "bpm",
      originalBpm: 100,
      targetBpm: 120,
      percent: 0,
      semitones: 0,
      cents: 0,
      format: "mp3",
      settings: defaultAudioExportSettings,
    });
    expect(plan.tempoRate).toBeCloseTo(1.2, 6);
    expect(plan.filter).toBe("atempo=1.2");
    expect(plan.estimatedDuration).toBeCloseTo(50, 5);
    expect(plan.args).toContain("-af");
    expect(plan.args).toContain("atempo=1.2");
    expect(plan.outputName).toBe("output.mp3");
  });
});
