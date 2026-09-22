/**
 * What the Web Audio graph should start for one playhead.
 * Identity tracks play trimmed source buffers. Any other tempo or pitch waits
 * for an offline-rendered track buffer. playbackRate is never used.
 */

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
}): StudioPlaybackPlan {
  const playhead = Number.isFinite(options.playheadSec) ? Math.max(0, options.playheadSec) : 0;
  const anySolo = projectHasSolo(options.project.tracks);
  const events: StudioScheduledEvent[] = [];
  const trackGains = options.project.tracks.map((track) => {
    const audible = isTrackAudible(track, anySolo);
    if (audible) events.push(...eventsForTrack(track, playhead, options.renderedTracks));
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
): StudioScheduledEvent[] {
  if (!trackTempoPitchIsIdentity(track)) {
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
    });
    return event ? [event] : [];
  }

  return track.clips.flatMap((clip) => {
    const event = eventForClip(track.id, clip, playhead);
    return event ? [event] : [];
  });
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
  };
}
