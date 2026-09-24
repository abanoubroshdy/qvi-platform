/**
 * Clip fade helpers for QVI Studio.
 * Lengths are heard seconds on the trimmed clip (after tempo).
 */

import { maxFadeSeconds } from "@/lib/audio-edit";

export const STUDIO_FADE_CAP_SEC = 5;

export type StudioClipFades = {
  fadeInSec: number;
  fadeOutSec: number;
};

export type StudioFadeRamp = {
  /** Seconds after the event starts on the audio clock. */
  atSec: number;
  gain: number;
};

/**
 * Clamp fade-in/out so they fit the heard clip. Same scaling rule as the audio cutter.
 */
export function normalizeClipFades(
  heardDurationSec: number,
  fadeInSec: number,
  fadeOutSec: number,
  capSec = STUDIO_FADE_CAP_SEC,
): StudioClipFades {
  const duration = Number.isFinite(heardDurationSec) ? Math.max(0, heardDurationSec) : 0;
  const maxEach = maxFadeSeconds(duration, capSec);
  let fadeIn = Math.min(maxEach, Math.max(0, Number.isFinite(fadeInSec) ? fadeInSec : 0));
  let fadeOut = Math.min(maxEach, Math.max(0, Number.isFinite(fadeOutSec) ? fadeOutSec : 0));
  if (fadeIn + fadeOut > duration && duration > 0) {
    const scale = duration / (fadeIn + fadeOut);
    fadeIn *= scale;
    fadeOut = Math.max(0, duration - fadeIn);
  }
  return {
    fadeInSec: round3(fadeIn),
    fadeOutSec: round3(fadeOut),
  };
}

/** Linear gain at a heard offset from the clip start. */
export function fadeGainAtHeardOffset(
  intoHeardSec: number,
  heardDurationSec: number,
  fades: StudioClipFades,
): number {
  const into = Math.max(0, Number.isFinite(intoHeardSec) ? intoHeardSec : 0);
  const duration = Math.max(0, Number.isFinite(heardDurationSec) ? heardDurationSec : 0);
  const { fadeInSec, fadeOutSec } = normalizeClipFades(duration, fades.fadeInSec, fades.fadeOutSec);
  if (!(duration > 0)) return 0;
  let gain = 1;
  if (fadeInSec > 0 && into < fadeInSec) gain = Math.min(gain, into / fadeInSec);
  if (fadeOutSec > 0 && into > duration - fadeOutSec) {
    const left = Math.max(0, duration - into);
    gain = Math.min(gain, left / fadeOutSec);
  }
  return Math.min(1, Math.max(0, gain));
}

/**
 * Gain automation for one playback slice.
 * `fromHeardSec` is how far into the full clip the slice begins.
 */
export function clipFadeRamps(options: {
  heardDurationSec: number;
  fromHeardSec: number;
  sliceHeardSec: number;
  fadeInSec: number;
  fadeOutSec: number;
}): { initialGain: number; ramps: StudioFadeRamp[] } {
  const full = Math.max(0, options.heardDurationSec);
  const from = Math.max(0, options.fromHeardSec);
  const slice = Math.max(0, options.sliceHeardSec);
  const fades = normalizeClipFades(full, options.fadeInSec, options.fadeOutSec);
  const initialGain = fadeGainAtHeardOffset(from, full, fades);
  if (!(slice > 0) || (fades.fadeInSec <= 0 && fades.fadeOutSec <= 0)) {
    return { initialGain: fades.fadeInSec <= 0 && fades.fadeOutSec <= 0 ? 1 : initialGain, ramps: [] };
  }
  const ramps: StudioFadeRamp[] = [];
  const end = from + slice;
  if (fades.fadeInSec > 0 && from < fades.fadeInSec && end > 0) {
    const reach = Math.min(fades.fadeInSec, end);
    if (reach > from) ramps.push({ atSec: reach - from, gain: fadeGainAtHeardOffset(reach, full, fades) });
  }
  if (fades.fadeOutSec > 0) {
    const fadeOutStart = Math.max(0, full - fades.fadeOutSec);
    if (end > fadeOutStart) {
      const startAt = Math.max(from, fadeOutStart);
      if (startAt > from) ramps.push({ atSec: startAt - from, gain: fadeGainAtHeardOffset(startAt, full, fades) });
      ramps.push({ atSec: slice, gain: fadeGainAtHeardOffset(end, full, fades) });
    }
  } else if (ramps.length === 0 && initialGain < 1) {
    // mid fade-in continuing to full
    const reach = Math.min(fades.fadeInSec, end);
    if (reach > from) ramps.push({ atSec: reach - from, gain: 1 });
  }
  return { initialGain, ramps: dedupeRamps(ramps) };
}

/** Apply linear fades to a buffer that already represents the heard clip. */
export function applyFadesToBuffer(
  buffer: AudioBuffer,
  fades: StudioClipFades,
  createBuffer: (channels: number, length: number, sampleRate: number) => AudioBuffer,
): AudioBuffer {
  const duration = buffer.duration;
  const normalized = normalizeClipFades(duration, fades.fadeInSec, fades.fadeOutSec);
  if (normalized.fadeInSec <= 0 && normalized.fadeOutSec <= 0) return buffer;
  const next = createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const fadeInSamples = Math.floor(normalized.fadeInSec * buffer.sampleRate);
  const fadeOutSamples = Math.floor(normalized.fadeOutSec * buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    const output = next.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) {
      let gain = 1;
      if (fadeInSamples > 0 && index < fadeInSamples) gain = Math.min(gain, index / fadeInSamples);
      if (fadeOutSamples > 0 && index >= buffer.length - fadeOutSamples) {
        gain = Math.min(gain, (buffer.length - 1 - index) / fadeOutSamples);
      }
      output[index] = (input[index] ?? 0) * gain;
    }
  }
  return next;
}

function dedupeRamps(ramps: StudioFadeRamp[]): StudioFadeRamp[] {
  const next: StudioFadeRamp[] = [];
  for (const ramp of ramps) {
    const last = next[next.length - 1];
    if (last && Math.abs(last.atSec - ramp.atSec) < 1e-6) {
      last.gain = ramp.gain;
      continue;
    }
    next.push({ ...ramp });
  }
  return next;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
