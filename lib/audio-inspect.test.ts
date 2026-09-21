import { describe, expect, it } from "vitest";
import {
  detectAudioFormat,
  estimateKbps,
  formatAudioSourceSummary,
  inspectAudioBuffer,
} from "@/lib/audio-inspect";

describe("detectAudioFormat", () => {
  it("reads the container from the file extension", () => {
    expect(detectAudioFormat({ name: "clip.MP3", type: "" })).toBe("mp3");
    expect(detectAudioFormat({ name: "a.wav", type: "" })).toBe("wav");
    expect(detectAudioFormat({ name: "a.m4a", type: "" })).toBe("m4a");
    expect(detectAudioFormat({ name: "a.oga", type: "" })).toBe("ogg");
    expect(detectAudioFormat({ name: "a.flac", type: "" })).toBe("flac");
  });

  it("falls back to mime type when the extension is missing", () => {
    expect(detectAudioFormat({ name: "blob", type: "audio/mpeg" })).toBe("mp3");
    expect(detectAudioFormat({ name: "blob", type: "audio/x-m4a" })).toBe("m4a");
    expect(detectAudioFormat({ name: "blob", type: "audio/ogg; codecs=vorbis" })).toBe("ogg");
  });

  it("returns unknown for unsupported names", () => {
    expect(detectAudioFormat({ name: "notes.txt", type: "text/plain" })).toBe("unknown");
  });
});

describe("estimateKbps", () => {
  it("estimates bitrate from size and duration", () => {
    // 192000 bits/s * 10s = 1_920_000 bits = 240_000 bytes
    expect(estimateKbps(240_000, 10)).toBe(192);
  });

  it("returns null for tiny or invalid durations", () => {
    expect(estimateKbps(1000, 0)).toBeNull();
    expect(estimateKbps(1000, 0.01)).toBeNull();
    expect(estimateKbps(-1, 10)).toBeNull();
  });
});

describe("inspectAudioBuffer", () => {
  it("combines File metadata with a decoded AudioBuffer", () => {
    const info = inspectAudioBuffer(
      { name: "voice.mp3", type: "audio/mpeg", size: 240_000 },
      { duration: 10, sampleRate: 44100, numberOfChannels: 2 },
    );
    expect(info).toEqual({
      duration: 10,
      sampleRate: 44100,
      channels: 2,
      format: "mp3",
      bytes: 240_000,
      estimatedKbps: 192,
    });
    expect(formatAudioSourceSummary(info)).toBe("44.1 kHz · stereo · ~192 kbps · MP3");
  });

  it("labels mono and omits bitrate when duration is unknown", () => {
    const info = inspectAudioBuffer(
      { name: "tone.wav", type: "audio/wav", size: 1000 },
      { duration: 0, sampleRate: 48000, numberOfChannels: 1 },
    );
    expect(info.estimatedKbps).toBeNull();
    expect(formatAudioSourceSummary(info)).toBe("48 kHz · mono · WAV");
  });
});
