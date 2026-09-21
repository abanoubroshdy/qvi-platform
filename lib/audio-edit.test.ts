import { describe, expect, it } from "vitest";
import {
  amixFilter,
  buildConcatExportPlan,
  buildConcatGraph,
  buildTrimExportPlan,
  clampSpliceFade,
  concatFilter,
  estimateAmixDuration,
  estimateConcatDuration,
  maxFadeSeconds,
  trimFadeFilter,
} from "@/lib/audio-edit";

describe("trimFadeFilter", () => {
  it("builds in and out afade filters relative to the trimmed clip", () => {
    const result = trimFadeFilter({ start: 2, end: 12, fadeIn: 1.5, fadeOut: 1 });
    expect(result.duration).toBe(10);
    expect(result.fadeIn).toBe(1.5);
    expect(result.fadeOut).toBe(1);
    expect(result.fadeOutStart).toBe(9);
    expect(result.filter).toBe("afade=t=in:st=0:d=1.5,afade=t=out:st=9:d=1");
  });

  it("returns an empty filter when fades are zero", () => {
    expect(trimFadeFilter({ start: 0, end: 5, fadeIn: 0, fadeOut: 0 }).filter).toBe("");
  });

  it("scales fades down when they exceed the clip length", () => {
    const result = trimFadeFilter({ start: 0, end: 2, fadeIn: 2, fadeOut: 2 });
    expect(result.duration).toBe(2);
    expect(result.fadeIn + result.fadeOut).toBeCloseTo(2, 5);
    expect(result.fadeOutStart).toBeCloseTo(result.duration - result.fadeOut, 5);
    expect(result.filter).toContain("afade=t=in");
    expect(result.filter).toContain("afade=t=out");
  });

  it("clamps a fade-out that is longer than the selection", () => {
    const result = trimFadeFilter({ start: 1, end: 3, fadeIn: 0, fadeOut: 10 });
    expect(result.fadeOut).toBe(2);
    expect(result.fadeOutStart).toBe(0);
    expect(result.filter).toBe("afade=t=out:st=0:d=2");
  });
});

describe("concatFilter", () => {
  it("hard-concats normalized inputs when splice fade is zero", () => {
    expect(concatFilter(2, { sampleRate: 44100, channels: 2, spliceFade: 0 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1[out]",
    );
  });

  it("chains acrossfade for splice fades", () => {
    expect(concatFilter(3, { sampleRate: 48000, channels: 1, spliceFade: 0.08 })).toBe(
      "[0:a]aformat=sample_rates=48000:channel_layouts=mono[a0];[1:a]aformat=sample_rates=48000:channel_layouts=mono[a1];[2:a]aformat=sample_rates=48000:channel_layouts=mono[a2];[a0][a1]acrossfade=d=0.08:c1=tri:c2=tri[x1];[x1][a2]acrossfade=d=0.08:c1=tri:c2=tri[out]",
    );
  });

  it("handles a single input", () => {
    expect(concatFilter(1, { sampleRate: 44100, channels: 2, spliceFade: 0.1 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[a0]anull[out]",
    );
  });
});

describe("amixFilter", () => {
  it("mixes normalized inputs with longest duration", () => {
    expect(amixFilter(2, { sampleRate: 44100, channels: 2 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[out]",
    );
  });
});

describe("duration estimates", () => {
  it("subtracts splice fades from concat length", () => {
    expect(estimateConcatDuration([10, 10, 10], 0.08)).toBeCloseTo(29.84, 5);
    expect(estimateConcatDuration([5, 5], 0)).toBe(10);
  });

  it("uses the longest clip for amix", () => {
    expect(estimateAmixDuration([3, 8, 5])).toBe(8);
    expect(estimateAmixDuration([])).toBe(0);
  });
});

describe("maxFadeSeconds", () => {
  it("caps fades at half the selection and 5 seconds", () => {
    expect(maxFadeSeconds(20)).toBe(5);
    expect(maxFadeSeconds(4)).toBe(2);
    expect(maxFadeSeconds(0)).toBe(0);
  });
});

describe("buildTrimExportPlan", () => {
  const baseSettings = {
    sampleRate: 44100,
    channels: 2 as const,
    bitrate: 192,
    mp3Mode: "cbr" as const,
    vbrQuality: 5,
    wavBitDepth: 16 as const,
    flacLevel: 5,
  };

  it("allows stream copy for MP3 with no fades when rate matches", () => {
    const plan = buildTrimExportPlan({
      inputName: "input.mp3",
      start: 1,
      end: 5,
      fadeIn: 0,
      fadeOut: 0,
      format: "mp3",
      settings: baseSettings,
      sourceSampleRate: 44100,
      sourceChannels: 2,
      bitrateUnchanged: true,
    });
    expect(plan.canStreamCopy).toBe(true);
    expect(plan.copyArgs).toEqual(["-i", "input.mp3", "-ss", "1.000", "-to", "5.000", "-c", "copy", "output.mp3"]);
    expect(plan.args).toContain("-vn");
    expect(plan.args).toContain("libmp3lame");
  });

  it("disables copy and inserts afade with fade-out start on the trimmed timeline", () => {
    const plan = buildTrimExportPlan({
      inputName: "input.mp3",
      start: 2,
      end: 12,
      fadeIn: 1,
      fadeOut: 1.5,
      format: "mp3",
      settings: baseSettings,
      sourceSampleRate: 44100,
      sourceChannels: 2,
    });
    expect(plan.canStreamCopy).toBe(false);
    expect(plan.copyArgs).toBeNull();
    expect(plan.fade.fadeOutStart).toBe(8.5);
    expect(plan.args).toContain("-af");
    expect(plan.args).toContain("afade=t=in:st=0:d=1,afade=t=out:st=8.5:d=1.5");
    expect(plan.args).toContain("-ar");
    expect(plan.args).toContain("44100");
  });

  it("builds a WAV export without stream copy", () => {
    const plan = buildTrimExportPlan({
      inputName: "input.wav",
      start: 0,
      end: 3,
      fadeIn: 0,
      fadeOut: 0,
      format: "wav",
      settings: { ...baseSettings, sampleRate: 48000, wavBitDepth: 16 },
    });
    expect(plan.extension).toBe("wav");
    expect(plan.canStreamCopy).toBe(false);
    expect(plan.args).toContain("pcm_s16le");
    expect(plan.args).toContain("48000");
  });
});

describe("buildConcatGraph / buildConcatExportPlan", () => {
  const baseSettings = {
    sampleRate: 44100,
    channels: 2 as const,
    bitrate: 192,
    mp3Mode: "cbr" as const,
    vbrQuality: 5,
    wavBitDepth: 16 as const,
    flacLevel: 5,
  };

  it("preps each clip with atrim and joins with acrossfade", () => {
    const graph = buildConcatGraph(
      [
        { start: 0, end: 5, fadeIn: 0, fadeOut: 0 },
        { start: 1, end: 6, fadeIn: 0.5, fadeOut: 0 },
      ],
      { sampleRate: 44100, channels: 2, spliceFade: 0.08 },
    );
    expect(graph).toContain("[0:a]atrim=start=0:end=5,asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo[a0]");
    expect(graph).toContain("afade=t=in:st=0:d=0.5");
    expect(graph).toContain("acrossfade=d=0.08:c1=tri:c2=tri[out]");
  });

  it("hard-concats when splice fade is zero", () => {
    const graph = buildConcatGraph(
      [
        { start: 0, end: 2, fadeIn: 0, fadeOut: 0 },
        { start: 0, end: 2, fadeIn: 0, fadeOut: 0 },
        { start: 0, end: 2, fadeIn: 0, fadeOut: 0 },
      ],
      { sampleRate: 48000, channels: 1, spliceFade: 0 },
    );
    expect(graph).toContain("concat=n=3:v=0:a=1[out]");
    expect(graph).not.toContain("acrossfade");
  });

  it("builds multi -i args and estimates joined duration", () => {
    const plan = buildConcatExportPlan({
      clips: [
        { inputName: "input0.mp3", start: 0, end: 10, fadeIn: 0, fadeOut: 0 },
        { inputName: "input1.wav", start: 0, end: 10, fadeIn: 0, fadeOut: 0 },
      ],
      format: "mp3",
      settings: baseSettings,
      spliceFade: 0.08,
    });
    expect(plan.spliceFade).toBe(0.08);
    expect(plan.estimatedDuration).toBeCloseTo(19.92, 5);
    expect(plan.args.slice(0, 4)).toEqual(["-i", "input0.mp3", "-i", "input1.wav"]);
    expect(plan.args).toContain("-filter_complex");
    expect(plan.args).toContain("-map");
    expect(plan.args).toContain("[out]");
    expect(plan.args).toContain("libmp3lame");
  });

  it("clamps splice fade below the shortest clip", () => {
    expect(clampSpliceFade(0.5, [0.2, 5])).toBeCloseTo(0.09, 5);
    expect(clampSpliceFade(0.08, [10, 10])).toBe(0.08);
  });
});
