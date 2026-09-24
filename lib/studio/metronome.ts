/**
 * Studio metronome and tap-tempo helpers.
 * Tap BPM reuses `lib/audio-tempo`. Clicks align to heard-time zero (bar 1 beat 1).
 */

import { clampBpm, DEFAULT_BPM } from "@/lib/audio-tempo";
import { STUDIO_BEATS_PER_BAR, secondsPerBeat } from "@/lib/studio/timeline-geometry";

export const STUDIO_METRONOME_LOOKAHEAD_SEC = 0.12;
export const STUDIO_METRONOME_SCHEDULE_MS = 25;
export const STUDIO_CLICK_DURATION_SEC = 0.04;
export const STUDIO_CLICK_ACCENT_HZ = 1200;
export const STUDIO_CLICK_BEAT_HZ = 880;

export type StudioMetronomeClick = {
  /** Heard timeline time. */
  timeSec: number;
  /** True on beat 1 of each bar. */
  accent: boolean;
};

export type StudioMetronomeAudio = {
  currentTime: number;
  destination: AudioNode;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
};

/** Beat length for the click track. Invalid tempos fall back to 120 BPM. */
export function metronomeBeatSec(bpm: number): number {
  return secondsPerBeat(Number.isFinite(bpm) && bpm > 0 ? clampBpm(bpm) : DEFAULT_BPM);
}

/**
 * Clicks whose heard times fall in [fromSec, toSec).
 * Index 0 is the downbeat at time 0.
 */
export function metronomeClicksInWindow(
  fromSec: number,
  toSec: number,
  bpm: number,
  beatsPerBar = STUDIO_BEATS_PER_BAR,
): StudioMetronomeClick[] {
  const beat = metronomeBeatSec(bpm);
  const start = Number.isFinite(fromSec) ? Math.max(0, fromSec) : 0;
  const end = Number.isFinite(toSec) ? toSec : start;
  if (!(end > start) || !(beat > 0)) return [];
  const bars = Number.isFinite(beatsPerBar) && beatsPerBar > 0 ? Math.floor(beatsPerBar) : STUDIO_BEATS_PER_BAR;
  const firstIndex = Math.ceil(start / beat - 1e-9);
  const clicks: StudioMetronomeClick[] = [];
  for (let index = Math.max(0, firstIndex); ; index += 1) {
    const timeSec = index * beat;
    if (timeSec >= end) break;
    if (timeSec < start) continue;
    clicks.push({ timeSec, accent: index % bars === 0 });
  }
  return clicks;
}

/** Map a heard-time click onto the AudioContext clock while transport is playing. */
export function contextTimeForHeardClick(
  clickHeardSec: number,
  playheadSec: number,
  contextNow: number,
): number {
  const heard = Number.isFinite(clickHeardSec) ? clickHeardSec : 0;
  const playhead = Number.isFinite(playheadSec) ? playheadSec : 0;
  const now = Number.isFinite(contextNow) ? contextNow : 0;
  return now + (heard - playhead);
}

/** Short blip into the destination. Safe to call from the scheduler timer. */
export function playMetronomeClick(
  audio: StudioMetronomeAudio,
  whenSec: number,
  accent: boolean,
): void {
  const startAt = Math.max(audio.currentTime, Number.isFinite(whenSec) ? whenSec : audio.currentTime);
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? STUDIO_CLICK_ACCENT_HZ : STUDIO_CLICK_BEAT_HZ;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.14, startAt + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + STUDIO_CLICK_DURATION_SEC);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + STUDIO_CLICK_DURATION_SEC + 0.01);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* already disconnected */
    }
  };
}
