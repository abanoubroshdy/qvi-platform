/**
 * QVI Studio v1 product contract (phase 0).
 *
 * This module defines the product, its surfaces, and the v1 boundary.
 * Later phases implement this contract. They do not widen v1 without editing it.
 * No studio UI, route, or engine ships from this phase.
 */

import { MAX_GAIN_DB, MIN_GAIN_DB } from "@/lib/audio-edit";
import { audioExportFormats, type AudioExportFormat } from "@/lib/audio-export";
import {
  DEFAULT_BPM,
  MAX_BPM,
  MAX_CENTS,
  MAX_SEMITONES,
  MAX_TEMPO_PERCENT,
  MIN_BPM,
  MIN_CENTS,
  MIN_SEMITONES,
  MIN_TEMPO_PERCENT,
  estimateOutputDuration,
  resolveTempoRate,
  type TempoMode,
} from "@/lib/audio-tempo";
import { FFMPEG_LARGE_FILE_BYTES } from "@/lib/ffmpeg";

export const STUDIO_PHASE = 0 as const;

export const qviStudioProduct = {
  id: "qvi-studio",
  name: "QVI Studio",
  version: "v1",
  kind: "miniature-daw",
  status: "defined",
  privacy: "on-device-only",
} as const;

/**
 * `/` is the product home and links to the studio.
 * The session lives at `/studio` and is restored from IndexedDB on this device after refresh.
 * It is not shared with the homepage. Nothing is uploaded.
 * QV1, Neyora, and the free tools stay linked from home. Studio is not a `/tools` utility.
 */
export const qviStudioSurfaces = {
  homepageRoute: "/",
  homepageRole: "product-home",
  workspaceRoute: "/studio",
  sameSessionOnHomeAndWorkspace: false,
  headerNav: true,
  listedInToolsHub: false,
  siblingLinks: ["qv1", "neyora", "tools"],
} as const;

export const qviStudioBreakpoints = {
  mobileMaxPx: 639,
  tabletMinPx: 640,
  tabletMaxPx: 1023,
  desktopMinPx: 1024,
} as const;

export type StudioViewport = "mobile" | "tablet" | "desktop";

/** Required regions. Timeline and clocks stay LTR in Arabic. */
export const qviStudioShells = {
  direction: "ltr",
  mobile: {
    transport: "fixed",
    chrome: "top",
    timeline: "primary",
    tracks: "list",
    mixer: "track-sheet",
    inspector: "track-sheet",
  },
  tablet: {
    transport: "bottom",
    chrome: "top",
    timeline: "full-width",
    mixer: "bottom-sheet",
    inspector: "slide-over",
  },
  desktop: {
    transport: "bottom",
    chrome: "top",
    trackHeaders: "leading",
    timeline: "center",
    mixer: "trailing",
    inspector: "drawer",
  },
} as const;

export const studioImportExtensions = ["mp3", "wav", "m4a", "ogg", "oga", "aac", "flac"] as const;

/** Bounce formats for v1. Preview is not an export. */
export const studioExportFormats = ["mp3", "wav"] as const;

export type StudioExportFormat = (typeof studioExportFormats)[number];

export const qviStudioLimits = {
  largeFileBytes: FFMPEG_LARGE_FILE_BYTES,
  largeFileBehavior: "warn-before-decode",
  tracks: {
    mobile: { maxTracks: 8, enforcement: "block" },
    tablet: { maxTracks: 12, enforcement: "warn" },
    desktop: { maxTracks: 16, enforcement: "warn" },
  },
  gainDb: { min: MIN_GAIN_DB, max: MAX_GAIN_DB, unity: 0 },
  tempo: {
    minBpm: MIN_BPM,
    maxBpm: MAX_BPM,
    defaultBpm: DEFAULT_BPM,
    minPercent: MIN_TEMPO_PERCENT,
    maxPercent: MAX_TEMPO_PERCENT,
    minSemitones: MIN_SEMITONES,
    maxSemitones: MAX_SEMITONES,
    minCents: MIN_CENTS,
    maxCents: MAX_CENTS,
  },
  /** Matches the Tempo Pitch tool debounce before an offline preview render. */
  previewDebounceMs: 700,
} as const;

export const qviStudioEngines = {
  playback: {
    runtime: "web-audio",
    nodes: [
      "AudioContext",
      "AudioBufferSourceNode",
      "GainNode",
      "AnalyserNode",
      "BiquadFilterNode",
      "DynamicsCompressorNode",
      "StereoPannerNode",
      "AudioWorkletNode",
    ],
    startPolicy: "resume-after-user-gesture",
  },
  tempoPitchPreview: {
    /** Slider scrubbing plays through the SoundTouch AudioWorklet. */
    strategy: "audio-worklet",
    /** Worklet registration can fail. Playback then waits for the offline render. */
    fallback: "offline-render",
    /** Live preview is WSOLA. Export still uses the phase vocoder when the clip allows it. */
    liveStretch: "wsola",
    engine: "soundtouch",
    /**
     * Default music preset. Speech stays on WSOLA. Solo vocal uses a denser
     * overlap. Mapping lives in `lib/audio-stretch-preset.ts`.
     */
    stretch: "phase-vocoder",
    debounceMs: qviStudioLimits.previewDebounceMs,
    /** playbackRate changes pitch with speed and is not the preview path. */
    forbiddenStrategies: ["playback-rate-only"],
    /** Identity tempo and pitch skip the offline render. */
    skipWhenUnchanged: true,
    /**
     * ffmpeg.wasm has no rubberband filter. Tempo and pitch use SoundTouchJS
     * (MPL-2.0), not Rubber Band.
     */
    rubberband: false,
  },
  export: {
    runtime: "ffmpeg-wasm",
    mix: "amix",
    /** Offline SoundTouch stretches each clip. ffmpeg only formats and sums the mix. */
    tempoPitch: "soundtouch",
    rubberband: false,
    formats: studioExportFormats,
  },
} as const;

export const qviStudioV1Capabilities = [
  {
    id: "import-audio-files",
    summary: "Add audio files as tracks or as extra clips on a track.",
    acceptance: [
      "Accept the same extensions as the audio cutter: mp3, wav, m4a, ogg, oga, aac, flac.",
      "A file dropped on the project creates a new track with one clip at offset 0.",
      "A file added to an existing track creates a clip whose default offset is the current end of that track.",
      "Files stay on device. Nothing is uploaded.",
      "Files at or above the large-file byte limit warn before decode.",
    ],
  },
  {
    id: "multi-clip-tracks",
    summary: "A track holds one or more clips. Tempo, pitch, and the mixer are track-level.",
    acceptance: [
      "Clips on one track may overlap and are summed before the track gain.",
      "Track tempo and pitch apply to every clip on that track.",
      "Adding a clip does not reset the track mix or tempo.",
    ],
  },
  {
    id: "shared-timeline",
    summary: "One horizontal timeline and one playhead for the project.",
    acceptance: [
      "The timeline shows heard time, after tempo, not raw source time.",
      "The playhead is shared by every track.",
      "A time range can be selected on the ruler without moving the playhead.",
      "Optional loop repeats playback inside the selected time range.",
      "Horizontal zoom is available.",
      "The timeline axis stays left-to-right in Arabic.",
    ],
  },
  {
    id: "clip-offset-and-trim",
    summary: "Each clip has a timeline offset and a source trim.",
    acceptance: [
      "offsetSec is >= 0 in heard time.",
      "trim uses source time, with trimEnd greater than trimStart.",
      "Pitch does not change heard length. Tempo does.",
    ],
  },
  {
    id: "track-mixer",
    summary: "Per-track volume, mute, and solo, plus a master volume.",
    acceptance: [
      "Gain is in dB from the existing audio-edit range, unity at 0 dB.",
      "Mute is not the same as minimum gain.",
      "If any track is solo, only soloed tracks that are not muted are audible.",
      "A muted solo track stays silent.",
      "Master gain applies after the track sum.",
    ],
  },
  {
    id: "per-track-tempo-pitch",
    summary: "Each track has tempo by BPM or percent, and pitch by semitones and cents.",
    acceptance: [
      "Ranges match the Tempo Pitch tool.",
      "Preview renders offline after the debounce, then plays the rendered buffer.",
      "Unchanged tempo and pitch skip that render.",
    ],
  },
  {
    id: "global-transport",
    summary: "Play, pause, stop, and seek apply to the whole project.",
    acceptance: [
      "Play starts at the playhead and is disabled when the timeline is empty.",
      "Pause holds the playhead.",
      "Stop silences playback and returns the playhead to 0.",
      "Seek clamps to the project timeline.",
      "AudioContext resumes only after a user gesture.",
    ],
  },
  {
    id: "export-mix",
    summary: "Bounce one mix that follows the same audibility rules as playback.",
    acceptance: [
      "Export formats are mp3 and wav.",
      "Muted tracks are excluded. Solo follows the mixer rule.",
      "An empty project cannot export.",
      "A project with no audible clips cannot export.",
      "Export duration is the heard end of the audible clips.",
    ],
  },
  {
    id: "responsive-shell",
    summary: "The same session works on phone, tablet, and desktop.",
    acceptance: [
      "Mobile uses a fixed transport, a timeline, and a track sheet for mix and inspector.",
      "Tablet uses a full-width timeline, a bottom-sheet mixer, and a slide-over inspector.",
      "Desktop uses a top transport, leading track headers, a center timeline, a trailing mixer, and an inspector drawer.",
    ],
  },
  {
    id: "local-session-restore",
    summary:
      "IndexedDB keeps the /studio session on this device. This replaces the earlier non-goal that said refresh cleared the project and that IndexedDB was out of scope.",
    acceptance: [
      "A debounced save writes the project snapshot and each clip's audio bytes to IndexedDB.",
      "Refreshing /studio restores tracks, clips, trims, mix, playhead, and decoded buffers.",
      "The project name can be edited. New project clears the stored session.",
      "Nothing is uploaded. Cloud sync stays out of scope.",
    ],
  },
  {
    id: "track-pan",
    summary: "Each track has a stereo pan on the playback graph.",
    acceptance: [
      "Pan is from full left to full right, center at 0.",
      "The mixer shows the pan and the playback graph applies it.",
      "Pan is stored with the session snapshot.",
    ],
  },
  {
    id: "track-eq-compressor",
    summary: "Each track has a fixed 3-band EQ and a light compressor on playback.",
    acceptance: [
      "Low, mid, and high gains are static inserts, not automation.",
      "Compressor amount 0 is bypass. Amount 1 is a light squeeze.",
      "The settings are stored with the session snapshot.",
      "There is no plugin host.",
    ],
  },
  {
    id: "live-recording",
    summary: "The microphone can record a new clip onto an armed track.",
    acceptance: [
      "Record starts only after a microphone permission gesture.",
      "A denied or missing microphone is explained in the console.",
      "Stopping the take writes a clip at the playhead on the armed track.",
      "The recording is stored with the session so refresh can play it.",
    ],
  },
] as const;

export type StudioCapabilityId = (typeof qviStudioV1Capabilities)[number]["id"];

export const qviStudioV1NonGoals = [
  {
    id: "automation",
    reason: "No volume or effect automation lanes. EQ and the compressor are static. Volume automation is a follow-up.",
  },
  { id: "buses-and-sends", reason: "No buses, groups, or sends in v1." },
  { id: "sidechain", reason: "No sidechain routing in v1." },
  { id: "midi", reason: "Studio v1 arranges audio files, not MIDI." },
  {
    id: "plugin-host",
    reason: "No plugin host. Playback inserts are only the fixed 3-band EQ and the light compressor.",
  },
  { id: "collaboration", reason: "No shared sessions in v1." },
  {
    id: "cloud-sync",
    reason: "IndexedDB restores the local /studio session after refresh. There is no cloud save, account sync, or upload.",
  },
  { id: "video-import", reason: "Video extraction stays on the MP4 to MP3 tool." },
  { id: "per-clip-gain-or-fades", reason: "Gain, mute, and solo are track-level. Clip fades stay on the audio cutter." },
  { id: "rubberband", reason: "Do not depend on Rubber Band. The wasm FFmpeg build has no rubberband filter. Tempo and pitch use SoundTouchJS (MPL-2.0)." },
  { id: "stem-separation", reason: "Stem separation stays on QV1." },
  { id: "instrument-synthesis", reason: "Instrument synthesis stays on Neyora." },
  { id: "tools-hub-listing", reason: "QVI Studio is a product surface, not a free-tool card." },
] as const;

export type StudioNonGoalId = (typeof qviStudioV1NonGoals)[number]["id"];

export const qviStudioPhase0Boundary = {
  delivers: [
    "product-identity",
    "surfaces",
    "v1-capabilities",
    "non-goals",
    "engines",
    "limits",
    "layout",
    "audibility-rule",
    "timeline-math",
  ],
  doesNotDeliver: [
    "components",
    "routes",
    "i18n-copy",
    "playback-engine",
    "ffmpeg-export",
    "homepage-ui",
    "project-store",
  ],
} as const;

export const studioRejectReasons = {
  emptyProject: "empty-project",
  nothingAudible: "nothing-audible",
  trackCapReached: "track-cap-reached",
} as const;

export type StudioRejectReason = (typeof studioRejectReasons)[keyof typeof studioRejectReasons];

export type StudioAudibility = {
  muted: boolean;
  solo: boolean;
};

export type StudioClipSpan = {
  offsetSec: number;
  trimStartSec: number;
  trimEndSec: number;
};

export type StudioTempoSetting = {
  mode: TempoMode;
  originalBpm: number;
  targetBpm: number;
  percent: number;
};

export function isTrackAudible(track: StudioAudibility, anySolo: boolean): boolean {
  if (track.muted) return false;
  if (anySolo) return track.solo;
  return true;
}

export function projectHasSolo(tracks: readonly StudioAudibility[]): boolean {
  return tracks.some((track) => track.solo);
}

export function audibleTracks<T extends StudioAudibility>(tracks: readonly T[]): T[] {
  const anySolo = projectHasSolo(tracks);
  return tracks.filter((track) => isTrackAudible(track, anySolo));
}

export function sourceClipDuration(clip: StudioClipSpan): number {
  if (!Number.isFinite(clip.trimStartSec) || !Number.isFinite(clip.trimEndSec)) return 0;
  return Math.max(0, clip.trimEndSec - clip.trimStartSec);
}

/** Heard length after tempo. Pitch-keep-duration does not change this. */
export function heardClipDuration(sourceDurationSec: number, tempo: StudioTempoSetting): number {
  return estimateOutputDuration(sourceDurationSec, resolveTempoRate(tempo));
}

export function clipTimelineEnd(clip: StudioClipSpan, tempo: StudioTempoSetting): number {
  const offset = Number.isFinite(clip.offsetSec) ? Math.max(0, clip.offsetSec) : 0;
  return offset + heardClipDuration(sourceClipDuration(clip), tempo);
}

export function timelineDuration(
  clips: readonly { clip: StudioClipSpan; tempo: StudioTempoSetting }[],
): number {
  return clips.reduce((max, item) => Math.max(max, clipTimelineEnd(item.clip, item.tempo)), 0);
}

/** New project files start at 0. Files added to a track start at that track's heard end. */
export function defaultClipOffset(existingHeardEndsSec: readonly number[]): number {
  if (existingHeardEndsSec.length === 0) return 0;
  const finite = existingHeardEndsSec.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return 0;
  return Math.max(0, ...finite);
}

export function canPlayProject(durationSec: number): boolean {
  return Number.isFinite(durationSec) && durationSec > 0;
}

export function exportBlockReason(options: {
  clipCount: number;
  audibleClipCount: number;
}): StudioRejectReason | null {
  if (options.clipCount <= 0) return studioRejectReasons.emptyProject;
  if (options.audibleClipCount <= 0) return studioRejectReasons.nothingAudible;
  return null;
}

export function canAddTrack(trackCount: number, viewport: StudioViewport): boolean {
  const limit = qviStudioLimits.tracks[viewport];
  if (limit.enforcement !== "block") return true;
  return trackCount < limit.maxTracks;
}

export function trackAddBlockReason(trackCount: number, viewport: StudioViewport): StudioRejectReason | null {
  return canAddTrack(trackCount, viewport) ? null : studioRejectReasons.trackCapReached;
}

/** Tablet and desktop keep accepting tracks, and warn once the comfortable count is reached. */
export function exceedsTrackWarning(trackCount: number, viewport: StudioViewport): boolean {
  const limit = qviStudioLimits.tracks[viewport];
  return limit.enforcement === "warn" && trackCount >= limit.maxTracks;
}

export function isStudioExportFormat(format: AudioExportFormat): format is StudioExportFormat {
  return (studioExportFormats as readonly AudioExportFormat[]).includes(format);
}

export function studioExportFormatsFitPlatform(): boolean {
  return studioExportFormats.every((format) =>
    (audioExportFormats as readonly string[]).includes(format),
  );
}
