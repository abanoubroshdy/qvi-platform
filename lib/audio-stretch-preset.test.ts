import { describe, expect, it } from "vitest";
import { createPcmBuffer, stretchAudioBuffer } from "@/lib/audio-stretch";
import {
  soundTouchFormantPreserve,
  parseStretchPreset,
  resolveStretchSettings,
  tempoPitchComfort,
} from "@/lib/audio-stretch-preset";

const LONG_RATE = 44100;
const LONG_FRAMES = LONG_RATE * 5;

describe("stretch preset mapping", () => {
  it("keeps music on the phase vocoder with overlap 4 inside the comfortable tempo range", () => {
    const settings = resolveStretchSettings({
      preset: "music",
      tempoRate: 1,
      frames: LONG_FRAMES,
      sampleRate: LONG_RATE,
    });
    expect(settings).toMatchObject({
      preset: "music",
      backend: "phase-vocoder",
      fftSize: 2048,
      overlapFactor: 4,
      sequenceMs: 0,
      seekWindowMs: 0,
      overlapMs: 12,
      quickSeek: false,
    });
  });

  it("raises the music phase-vocoder overlap to 8 at extreme tempo when the clip is long enough", () => {
    const settings = resolveStretchSettings({
      tempoRate: 0.25,
      frames: LONG_FRAMES,
      sampleRate: LONG_RATE,
    });
    expect(settings.preset).toBe("music");
    expect(settings.backend).toBe("phase-vocoder");
    expect(settings.overlapFactor).toBe(8);
  });

  it("falls music back to WSOLA when the clip is too short for the phase vocoder", () => {
    const settings = resolveStretchSettings({
      preset: "music",
      tempoRate: 0.25,
      frames: 100,
      sampleRate: LONG_RATE,
    });
    expect(settings.backend).toBe("wsola");
    expect(settings.overlapMs).toBe(12);
    expect(settings.quickSeek).toBe(false);
    expect(settings.sequenceMs).toBe(0);
    expect(settings.seekWindowMs).toBe(0);
  });

  it("maps speech to the SoundTouch WSOLA speech windows even on a long clip", () => {
    const settings = resolveStretchSettings({
      preset: "speech",
      tempoRate: 1.5,
      frames: LONG_FRAMES,
      sampleRate: LONG_RATE,
    });
    expect(settings).toMatchObject({
      preset: "speech",
      backend: "wsola",
      sequenceMs: 40,
      seekWindowMs: 15,
      overlapMs: 8,
      quickSeek: true,
    });
  });

  it("maps solo vocal to a denser phase vocoder and a wider WSOLA fallback", () => {
    const vocal = resolveStretchSettings({
      preset: "solo-vocal",
      tempoRate: 1,
      frames: LONG_FRAMES,
      sampleRate: LONG_RATE,
    });
    expect(vocal).toMatchObject({
      preset: "solo-vocal",
      backend: "phase-vocoder",
      fftSize: 2048,
      overlapFactor: 8,
      sequenceMs: 60,
      seekWindowMs: 20,
      overlapMs: 12,
      quickSeek: false,
    });

    const short = resolveStretchSettings({
      preset: "solo-vocal",
      tempoRate: 1,
      frames: 1000,
      sampleRate: LONG_RATE,
    });
    expect(short.backend).toBe("wsola");
    expect(short.sequenceMs).toBe(60);
    expect(short.seekWindowMs).toBe(20);
    expect(short.quickSeek).toBe(false);
  });

  it("treats an unknown preset as music", () => {
    expect(parseStretchPreset("nope")).toBe("music");
    expect(parseStretchPreset(null)).toBe("music");
    expect(resolveStretchSettings({ preset: "studio", tempoRate: 1, frames: LONG_FRAMES, sampleRate: LONG_RATE }).preset).toBe(
      "music",
    );
  });

  it("documents that SoundTouchJS cannot preserve formants", () => {
    expect(soundTouchFormantPreserve).toBe(false);
  });
});

describe("tempo and pitch comfort", () => {
  it("stays quiet on the comfortable rails", () => {
    expect(tempoPitchComfort({ tempoRate: 0.5, semitones: 0, cents: 0 })).toEqual({ tempo: false, pitch: false });
    expect(tempoPitchComfort({ tempoRate: 2, semitones: 12, cents: 0 })).toEqual({ tempo: false, pitch: false });
    expect(tempoPitchComfort({ tempoRate: 1, semitones: -12, cents: 0 }).pitch).toBe(false);
  });

  it("warns when BPM tempo or stacked cents leave the comfortable range", () => {
    expect(tempoPitchComfort({ tempoRate: 40 / 240, semitones: 0, cents: 0 }).tempo).toBe(true);
    expect(tempoPitchComfort({ tempoRate: 240 / 40, semitones: 0, cents: 0 }).tempo).toBe(true);
    expect(tempoPitchComfort({ tempoRate: 1, semitones: 12, cents: 1 }).pitch).toBe(true);
    expect(tempoPitchComfort({ tempoRate: 1, semitones: -12, cents: -1 }).pitch).toBe(true);
    expect(tempoPitchComfort({ tempoRate: 1, semitones: 11, cents: 50 }).pitch).toBe(false);
  });
});

describe("preset stretch length", () => {
  it("keeps the speech preset on the same output length as music", () => {
    const frames = 4096;
    const buffer = createPcmBuffer(1, frames, 8000);
    buffer.getChannelData(0).fill(0.2);
    const music = stretchAudioBuffer(buffer, { tempoRate: 2, semitones: 0, cents: 0, preset: "music" });
    const speech = stretchAudioBuffer(buffer, { tempoRate: 2, semitones: 0, cents: 0, preset: "speech" });
    expect(music.length).toBe(frames / 2);
    expect(speech.length).toBe(frames / 2);
  });
});
