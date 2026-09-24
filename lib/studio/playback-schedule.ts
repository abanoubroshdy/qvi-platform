/**
 * What the Web Audio graph should start for one playhead.
 * Identity tracks play trimmed source buffers. Without a live worklet, any
 * other tempo or pitch waits for an offline-rendered track buffer.
 * With `live`, those tracks play the source through SoundTouch: the source
 * playbackRate is the tempo, and the worklet keeps pitch independent.
 */

import { liveStretchParams, type LiveStretchParams } from "@/lib/audio-stretch-live";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { isTrackAudible, projectHasSolo } from "@/lib/studio/definition";
import { trackTempoPitchIsIdentity } from "@/lib/studio/project";
import type { StudioClip, StudioProject, StudioTrack } from "@/lib/studio/types";

const MIN_SLICE_SEC = 1e-4;

export function dbToGain(gainDb: number): number {
  if (!Number.isFinite(gainDb)) return 1;
  return 10 ** (gainDb / 20);
}

export type StudioScheduledEvent = {
  trackId: string;
  /** Null when the event plays a rendered track buffer instead of one clip. */
  clipId: string | null;
  buffer: AudioBuffer;
  delaySec: number;
  offsetSec: number;
  durationSec: number;
  /** 1 for identity and baked buffers. Tempo rate when the event is live. */
  playbackRate: number;
  /** Set when this event must pass through the SoundTouch worklet. */
  stretch: LiveStretchParams | null;
  /** Full heard length of the clip (for fade math). */
  clipHeardDurationSec: number;
  /** Heard offset into the clip where this event starts. */
  fromHeardSec: number;
  fadeInSec: number;
  fadeOutSec: number;
};

export type StudioPlaybackPlan = {
  masterGain: number;
  trackGains: { trackId: string; linear: number }[];
  events: StudioScheduledEvent[];
};

export function planPlayback(options: {
  project: StudioProject;
  playheadSec: number;
  renderedTracks?: ReadonlyMap<string, AudioBuffer>;
  /** Play tempo and pitch through the worklet instead of a baked buffer. */
  live?: boolean;
}): StudioPlaybackPlan {
  const playhead = Number.isFinite(options.playheadSec) ? Math.max(0, options.playheadSec) : 0;
  const anySolo = projectHasSolo(options.project.tracks);
  const events: StudioScheduledEvent[] = [];
  const trackGains = options.project.tracks.map((track) => {
    const audible = isTrackAudible(track, anySolo);
    if (audible) events.push(...eventsForTrack(track, playhead, options.renderedTracks, options.live === true));
    return { trackId: track.id, linear: audible ? dbToGain(track.gainDb) : 0 };
  });
  return {
    masterGain: dbToGain(options.project.masterGainDb),
    trackGains,
    events,
  };
}

function eventsForTrack(
  track: StudioTrack,
  playhead: number,
  renderedTracks: ReadonlyMap<string, AudioBuffer> | undefined,
  live: boolean,
): StudioScheduledEvent[] {
  if (!trackTempoPitchIsIdentity(track)) {
    if (live) {
      const stretch = liveStretchParams({
        tempoRate: resolveTempoRate(track.tempo),
        semitones: track.pitchSemitones,
        cents: track.pitchCents,
        preset: track.stretchPreset,
      });
      return track.clips.flatMap((clip) => {
        const event = eventForLiveClip(track.id, clip, playhead, stretch);
        return event ? [event] : [];
      });
    }
    const rendered = renderedTracks?.get(track.id);
    if (!rendered) return [];
    const event = eventFromBuffer({
      trackId: track.id,
      clipId: null,
      buffer: rendered,
      heardStartSec: 0,
      sourceOffsetSec: 0,
      sourceDurationSec: rendered.duration,
      playhead,
      fadeInSec: 0,
      fadeOutSec: 0,
      clipHeardDurationSec: rendered.duration,
    });
    return event ? [event] : [];
  }

  return track.clips.flatMap((clip) => {
    const event = eventForClip(track.id, clip, playhead);
    return event ? [event] : [];
  });
}

function eventForLiveClip(
  trackId: string,
  clip: StudioClip,
  playhead: number,
  stretch: LiveStretchParams,
): StudioScheduledEvent | null {
  if (!clip.buffer) return null;
  const rate = stretch.playbackRate;
  const sourceDuration = Math.max(0, clip.trimEndSec - clip.trimStartSec);
  const heardDuration = sourceDuration / rate;
  const heardStart = Math.max(0, clip.offsetSec);
  if (playhead >= heardStart + heardDuration - MIN_SLICE_SEC) return null;
  const intoHeard = Math.max(0, playhead - heardStart);
  const offsetSec = Math.max(0, clip.trimStartSec) + intoHeard * rate;
  const durationSec = Math.min(sourceDuration - intoHeard * rate, Math.max(0, clip.buffer.duration - offsetSec));
  if (durationSec < MIN_SLICE_SEC) return null;
  return {
    trackId,
    clipId: clip.id,
    buffer: clip.buffer,
    delaySec: Math.max(0, heardStart - playhead),
    offsetSec,
    durationSec,
    playbackRate: rate,
    stretch,
    clipHeardDurationSec: heardDuration,
    fromHeardSec: intoHeard,
    fadeInSec: clip.fadeInSec ?? 0,
    fadeOutSec: clip.fadeOutSec ?? 0,
  };
}

function eventForClip(trackId: string, clip: StudioClip, playhead: number): StudioScheduledEvent | null {
  if (!clip.buffer) return null;
  const sourceDuration = Math.max(0, clip.trimEndSec - clip.trimStartSec);
  return eventFromBuffer({
    trackId,
    clipId: clip.id,
    buffer: clip.buffer,
    heardStartSec: Math.max(0, clip.offsetSec),
    sourceOffsetSec: Math.max(0, clip.trimStartSec),
    sourceDurationSec: sourceDuration,
    playhead,
    fadeInSec: clip.fadeInSec ?? 0,
    fadeOutSec: clip.fadeOutSec ?? 0,
    clipHeardDurationSec: sourceDuration,
  });
}

function eventFromBuffer(input: {
  trackId: string;
  clipId: string | null;
  buffer: AudioBuffer;
  heardStartSec: number;
  sourceOffsetSec: number;
  sourceDurationSec: number;
  playhead: number;
  fadeInSec: number;
  fadeOutSec: number;
  clipHeardDurationSec: number;
}): StudioScheduledEvent | null {
  const heardEnd = input.heardStartSec + input.sourceDurationSec;
  if (input.playhead >= heardEnd - MIN_SLICE_SEC) return null;
  const into = Math.max(0, input.playhead - input.heardStartSec);
  const offsetSec = input.sourceOffsetSec + into;
  const durationSec = Math.min(input.sourceDurationSec - into, Math.max(0, input.buffer.duration - offsetSec));
  if (durationSec < MIN_SLICE_SEC) return null;
  return {
    trackId: input.trackId,
    clipId: input.clipId,
    buffer: input.buffer,
    delaySec: Math.max(0, input.heardStartSec - input.playhead),
    offsetSec,
    durationSec,
    playbackRate: 1,
    stretch: null,
    clipHeardDurationSec: input.clipHeardDurationSec,
    fromHeardSec: into,
    fadeInSec: input.fadeInSec,
    fadeOutSec: input.fadeOutSec,
  };
}
