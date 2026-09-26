/**
 * What the Web Audio graph should start for one playhead.
 * Identity tracks always play trimmed source buffers (no SoundTouch), whether or
 * not a live worklet is available — so many tracks stay cheap to arm.
 * Without a live worklet, any other tempo or pitch waits for an offline-rendered
 * track buffer. With `live`, only non-identity tracks play through SoundTouch
 * (capped by maxLiveStretchTracks); extras use the offline bake. Changing
 * stretch identity or live-slot assignment requires a re-arm.
 */

import { liveStretchParams, type LiveStretchParams } from "@/lib/audio-stretch-live";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { isTrackAudible, projectHasSolo, qviStudioLimits } from "@/lib/studio/definition";
import { trackTempoPitchIsIdentity } from "@/lib/studio/project";
import type { StudioClip, StudioProject, StudioTrack } from "@/lib/studio/types";

const MIN_SLICE_SEC = 1e-4;

/** Re-export for callers that need the same cap the schedule uses. */
export const STUDIO_MAX_LIVE_STRETCH_TRACKS = qviStudioLimits.maxLiveStretchTracks;

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
  /** Override the default cap on simultaneous live stretch tracks. */
  maxLiveStretchTracks?: number;
}): StudioPlaybackPlan {
  const playhead = Number.isFinite(options.playheadSec) ? Math.max(0, options.playheadSec) : 0;
  const anySolo = projectHasSolo(options.project.tracks);
  const maxLive = Math.max(
    0,
    Math.floor(options.maxLiveStretchTracks ?? STUDIO_MAX_LIVE_STRETCH_TRACKS),
  );
  let liveSlots = options.live === true ? maxLive : 0;
  const events: StudioScheduledEvent[] = [];
  const trackGains = options.project.tracks.map((track) => {
    const audible = isTrackAudible(track, anySolo);
    if (audible) {
      const useLive = !trackTempoPitchIsIdentity(track) && liveSlots > 0;
      if (useLive) liveSlots -= 1;
      events.push(...eventsForTrack(track, playhead, options.renderedTracks, useLive));
    }
    return { trackId: track.id, linear: audible ? dbToGain(track.gainDb) : 0 };
  });
  return {
    masterGain: dbToGain(options.project.masterGainDb),
    trackGains,
    events,
  };
}

/**
 * Clip layout, audibility, and whether each track needs a live stretch node.
 * Exact tempo/pitch values and gain are not part of it — those update in place
 * when the stretch graph shape stays the same. Non-identity tracks beyond the
 * live-stretch cap are marked `bake` so the engine re-arms when slots change.
 */
export function playbackArrangementKey(
  project: StudioProject,
  maxLiveStretchTracks: number = STUDIO_MAX_LIVE_STRETCH_TRACKS,
): string {
  const anySolo = projectHasSolo(project.tracks);
  let liveSlots = Math.max(0, Math.floor(maxLiveStretchTracks));
  return project.tracks
    .map((track) => {
      const audible = isTrackAudible(track, anySolo) ? "1" : "0";
      let stretch = "id";
      if (!trackTempoPitchIsIdentity(track)) {
        if (liveSlots > 0) {
          stretch = "live";
          liveSlots -= 1;
        } else {
          stretch = "bake";
        }
      }
      const clips = track.clips
        .map((clip) =>
          [
            clip.id,
            clip.offsetSec,
            clip.trimStartSec,
            clip.trimEndSec,
            clip.buffer?.length ?? 0,
            clip.buffer?.sampleRate ?? 0,
          ].join(":"),
        )
        .join(",");
      return `${track.id}#${audible}#${stretch}#${clips}`;
    })
    .join("|");
}

function eventsForTrack(
  track: StudioTrack,
  playhead: number,
  renderedTracks: ReadonlyMap<string, AudioBuffer> | undefined,
  useLiveStretch: boolean,
): StudioScheduledEvent[] {
  if (trackTempoPitchIsIdentity(track)) {
    return track.clips.flatMap((clip) => {
      const event = eventForClip(track.id, clip, playhead);
      return event ? [event] : [];
    });
  }
  if (useLiveStretch) {
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
