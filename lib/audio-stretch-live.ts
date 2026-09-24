/**
 * Parameters for the realtime SoundTouch worklet.
 *
 * The audio thread lives in `@soundtouchjs/audio-worklet`. This module only
 * computes the values the main thread writes to AudioParams and the
 * stretch-parameter message. It does not run inside the render callback.
 *
 * Live playback is WSOLA. Music and solo vocal still use the phase vocoder
 * on the offline export path when the clip is long enough.
 */

import { resolveStretchSettings, type StretchPresetId } from "@/lib/audio-stretch-preset";

/** Matches the worklet AudioParam limits in `@soundtouchjs/audio-worklet`. */
export const LIVE_MIN_PLAYBACK_RATE = 0.1;
export const LIVE_MAX_PLAYBACK_RATE = 8;
export const LIVE_MIN_PITCH_SEMITONES = -24;
export const LIVE_MAX_PITCH_SEMITONES = 24;

export type LiveStretchSettings = {
  sequenceMs: number;
  seekWindowMs: number;
  overlapMs: number;
  quickSeek: boolean;
};

export type LiveStretchParams = {
  /** Source and worklet playback rate. The worklet uses it to keep pitch stable. */
  playbackRate: number;
  /** Extra pitch ratio. 1 leaves semitones in charge. */
  pitch: number;
  pitchSemitones: number;
  stretch: LiveStretchSettings;
};

export function liveStretchParams(input: {
  tempoRate: number;
  semitones: number;
  cents: number;
  preset?: StretchPresetId | null;
}): LiveStretchParams {
  const rawRate = Number.isFinite(input.tempoRate) && input.tempoRate > 0 ? input.tempoRate : 1;
  const playbackRate = clamp(rawRate, LIVE_MIN_PLAYBACK_RATE, LIVE_MAX_PLAYBACK_RATE);
  const semitones = Number.isFinite(input.semitones) ? input.semitones : 0;
  const cents = Number.isFinite(input.cents) ? input.cents : 0;
  const pitchSemitones = clamp(semitones + cents / 100, LIVE_MIN_PITCH_SEMITONES, LIVE_MAX_PITCH_SEMITONES);
  const settings = resolveStretchSettings({
    preset: input.preset,
    tempoRate: playbackRate,
    frames: 0,
    sampleRate: 48000,
  });
  return {
    playbackRate,
    pitch: 1,
    pitchSemitones,
    stretch: {
      sequenceMs: settings.sequenceMs,
      seekWindowMs: settings.seekWindowMs,
      overlapMs: settings.overlapMs,
      quickSeek: settings.quickSeek,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
