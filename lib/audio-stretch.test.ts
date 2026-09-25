import { describe, expect, it } from "vitest";
import { createPcmBuffer, stretchAudioBuffer } from "@/lib/audio-stretch";
import { copyBufferChannels, stretchAudioBufferOffThread, stretchOnCallingThreadAllowed, MAIN_THREAD_STRETCH_FRAMES } from "@/lib/audio-stretch-task";

function sine(frames: number, sampleRate: number, frequencies: number[], amplitude = 0.6): AudioBuffer {
  const buffer = createPcmBuffer(frequencies.length, frames, sampleRate);
  for (let channel = 0; channel < frequencies.length; channel += 1) {
    const data = buffer.getChannelData(channel);
    const frequency = frequencies[channel] ?? 440;
    for (let index = 0; index < frames; index += 1) {
      data[index] = amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate);
    }
  }
  return buffer;
}

function estimateHz(samples: Float32Array, sampleRate: number): number {
  const start = Math.floor(samples.length * 0.25);
  const end = Math.max(start + 2, Math.floor(samples.length * 0.75));
  let crossings = 0;
  let previous = samples[start] ?? 0;
  for (let index = start + 1; index < end; index += 1) {
    const value = samples[index] ?? 0;
    if ((previous <= 0 && value > 0) || (previous >= 0 && value < 0)) crossings += 1;
    previous = value;
  }
  const seconds = (end - start) / sampleRate;
  return seconds > 0 ? crossings / 2 / seconds : 0;
}

function closeHz(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) / expected < 0.015;
}

function rms(samples: Float32Array): number {
  let energy = 0;
  for (let index = 0; index < samples.length; index += 1) energy += (samples[index] ?? 0) ** 2;
  return Math.sqrt(energy / Math.max(1, samples.length));
}

describe("stretchAudioBuffer", () => {
  const sampleRate = 22050;
  const frames = sampleRate;

  it("copies samples when tempo and pitch are unchanged", () => {
    const source = sine(1200, 8000, [440]);
    const stretched = stretchAudioBuffer(source, { tempoRate: 1, semitones: 0, cents: 0 });
    expect(Array.from(stretched.getChannelData(0))).toEqual(Array.from(source.getChannelData(0)));
  });

  it("changes length with tempo and keeps pitch", () => {
    const source = sine(frames, sampleRate, [440]);
    const faster = stretchAudioBuffer(source, { tempoRate: 2, semitones: 0, cents: 0 });
    const slower = stretchAudioBuffer(source, { tempoRate: 0.5, semitones: 0, cents: 0 });
    expect(faster.length).toBe(Math.round(frames / 2));
    expect(slower.length).toBe(Math.round(frames / 0.5));
    expect(estimateHz(faster.getChannelData(0), sampleRate)).toBeCloseTo(440, 0);
    expect(estimateHz(slower.getChannelData(0), sampleRate)).toBeCloseTo(440, 0);
    expect(rms(faster.getChannelData(0))).toBeGreaterThan(0.35);
    expect(rms(slower.getChannelData(0))).toBeGreaterThan(0.35);
  });

  it("shifts pitch by an octave without changing length", () => {
    const source = sine(frames, sampleRate, [440]);
    const up = stretchAudioBuffer(source, { tempoRate: 1, semitones: 12, cents: 0 });
    const down = stretchAudioBuffer(sine(frames, sampleRate, [880]), { tempoRate: 1, semitones: -12, cents: 0 });
    expect(up.length).toBe(frames);
    expect(down.length).toBe(frames);
    expect(estimateHz(up.getChannelData(0), sampleRate)).toBeCloseTo(880, 0);
    expect(estimateHz(down.getChannelData(0), sampleRate)).toBeCloseTo(440, 0);
  });

  it("applies cents and combined tempo plus pitch", () => {
    const source = sine(frames, sampleRate, [440]);
    const cents = stretchAudioBuffer(source, { tempoRate: 1, semitones: 0, cents: 50 });
    const both = stretchAudioBuffer(source, { tempoRate: 1.2, semitones: 2, cents: 0 });
    expect(cents.length).toBe(frames);
    expect(closeHz(estimateHz(cents.getChannelData(0), sampleRate), 440 * 2 ** (50 / 1200))).toBe(true);
    expect(both.length).toBe(Math.round(frames / 1.2));
    expect(closeHz(estimateHz(both.getChannelData(0), sampleRate), 440 * 2 ** (2 / 12))).toBe(true);
  });

  it("keeps a slow stretch in tune", () => {
    const source = sine(frames, sampleRate, [220]);
    const stretched = stretchAudioBuffer(source, { tempoRate: 0.25, semitones: 0, cents: 0 });
    expect(stretched.length).toBe(Math.round(frames / 0.25));
    expect(estimateHz(stretched.getChannelData(0), sampleRate)).toBeCloseTo(220, 0);
  });

  it("stretches each channel", () => {
    const source = sine(frames, sampleRate, [440, 660]);
    const stretched = stretchAudioBuffer(source, { tempoRate: 1, semitones: 12, cents: 0 });
    expect(stretched.numberOfChannels).toBe(2);
    expect(estimateHz(stretched.getChannelData(0), sampleRate)).toBeCloseTo(880, 0);
    expect(estimateHz(stretched.getChannelData(1), sampleRate)).toBeCloseTo(1320, 0);
  });

  it("stops when the signal is already aborted", () => {
    const source = sine(frames, sampleRate, [440]);
    expect(() =>
      stretchAudioBuffer(source, { tempoRate: 1.5, semitones: 0, cents: 0, signal: AbortSignal.abort() }),
    ).toThrow(/Aborted/);
  });
});

describe("stretchAudioBufferOffThread", () => {
  it("copies channels in slices and refuses a full-clip stretch on the calling thread", async () => {
    const source = sine(8, 8000, [440, 660]);
    const copied = await copyBufferChannels(source, undefined, 3);
    expect(copied).toHaveLength(2);
    expect(Array.from(copied[0]!.subarray(0, 8))).toEqual(Array.from(source.getChannelData(0)));
    expect(Array.from(copied[1]!.subarray(0, 8))).toEqual(Array.from(source.getChannelData(1)));
    expect(stretchOnCallingThreadAllowed(MAIN_THREAD_STRETCH_FRAMES)).toBe(true);
    expect(stretchOnCallingThreadAllowed(MAIN_THREAD_STRETCH_FRAMES + 1)).toBe(false);
    const long = createPcmBuffer(1, MAIN_THREAD_STRETCH_FRAMES + 1, 48000);
    await expect(stretchAudioBufferOffThread(long, { tempoRate: 1.25, semitones: 1, cents: 0 })).rejects.toThrow(/worker/i);
  });

  it("returns a stretched buffer when no worker is available", async () => {
    const frames = 4096;
    const source = sine(frames, 8000, [440]);
    const stretched = await stretchAudioBufferOffThread(source, { tempoRate: 2, semitones: 0, cents: 0 });
    expect(stretched.length).toBe(frames / 2);
    expect(closeHz(estimateHz(stretched.getChannelData(0), 8000), 440)).toBe(true);
  });
});