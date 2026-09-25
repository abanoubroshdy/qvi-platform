import { describe, expect, it } from "vitest";
import { defaultAudioExportSettings } from "@/lib/audio-export";
import { videoAudioExportSpec, videoAudioSampleRates } from "@/lib/video-audio";

const base = defaultAudioExportSettings;

describe("videoAudioExportSpec", () => {
  it("reuses the shared MP3 encoder flags and drops the video stream", () => {
    const spec = videoAudioExportSpec("mp3", "in0.mp4", base);
    expect(spec.outputName).toBe("output.mp3");
    expect(spec.mimeType).toBe("audio/mpeg");
    expect(spec.args).toEqual([
      "-i",
      "in0.mp4",
      "-vn",
      "-map",
      "0:a:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      "-ac",
      "2",
      "output.mp3",
    ]);
    expect(spec.fallbackArgs[0]).not.toContain("-map");
  });

  it("encodes AAC in an ADTS file with bitrate, rate, and channels", () => {
    const spec = videoAudioExportSpec("aac", "in0.mov", { ...base, bitrate: 128, sampleRate: 48000, channels: 1 });
    expect(spec.args).toContain("-c:a");
    expect(spec.args).toContain("aac");
    expect(spec.args).toEqual([
      "-i",
      "in0.mov",
      "-vn",
      "-map",
      "0:a:0",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-ac",
      "1",
      "output.aac",
    ]);
  });

  it("clamps Opus to a supported rate and uses libopus", () => {
    expect(videoAudioSampleRates("opus")).toEqual([48000, 24000, 16000]);
    const spec = videoAudioExportSpec("opus", "in0.mkv", { ...base, sampleRate: 44100, bitrate: 96 });
    expect(spec.mimeType).toBe("audio/opus");
    expect(spec.args).toEqual([
      "-i",
      "in0.mkv",
      "-vn",
      "-map",
      "0:a:0",
      "-c:a",
      "libopus",
      "-b:a",
      "96k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "output.opus",
    ]);
  });

  it("writes AIFF as big-endian PCM and honors 24-bit", () => {
    const spec = videoAudioExportSpec("aiff", "in0.webm", { ...base, wavBitDepth: 24, sampleRate: 96000 });
    expect(spec.args).toContain("pcm_s24be");
    expect(spec.args).toContain("96000");
    expect(spec.outputName).toBe("output.aiff");
  });

  it("targets wmav2 and keeps an experimental fallback", () => {
    const spec = videoAudioExportSpec("wma", "in0.avi", { ...base, bitrate: 128 });
    expect(spec.args).toContain("wmav2");
    expect(spec.args).not.toContain("-strict");
    expect(spec.fallbackArgs.at(-1)).toContain("-strict");
    expect(spec.fallbackArgs.at(-1)).toContain("experimental");
  });

  it("encodes FLAC through the shared spec", () => {
    const spec = videoAudioExportSpec("flac", "in0.mp4", { ...base, flacLevel: 8 });
    expect(spec.args).toContain("flac");
    expect(spec.args).toContain("-compression_level");
    expect(spec.args).toContain("8");
  });
});
