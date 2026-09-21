import {
  audioCodecArgs,
  audioExportMimeType,
  audioExportOutputName,
  clampAudioExportSettings,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";

export type TrimFadeOptions = {
  /** Selection start on the source timeline (seconds). */
  start: number;
  /** Selection end on the source timeline (seconds). */
  end: number;
  fadeIn: number;
  fadeOut: number;
};

export type TrimFadeResult = {
  /** Duration of the trimmed clip after clamping fades. */
  duration: number;
  fadeIn: number;
  fadeOut: number;
  /** Start time of the fade-out within the trimmed clip. */
  fadeOutStart: number;
  /**
   * FFmpeg `-af` / filter graph fragment for the trimmed selection.
   * Empty string when neither fade is needed (caller may omit `-af`).
   */
  filter: string;
};

export type StreamFormatOptions = {
  sampleRate: number;
  channels: 1 | 2;
};

export type ConcatFilterOptions = StreamFormatOptions & {
  /** Crossfade at each splice point in seconds. 0 = hard concat. */
  spliceFade: number;
};

export type AmixFilterOptions = StreamFormatOptions;

export type TrimExportPlan = {
  fade: TrimFadeResult;
  canStreamCopy: boolean;
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  /** Fast path when no fades and output can stay MP3 stream-copy. */
  copyArgs: string[] | null;
  /** Primary re-encode / filtered args. */
  args: string[];
  fallbackArgs: string[][];
};

export type ConcatClipSpec = {
  /** Virtual FS input name, e.g. input0.mp3 */
  inputName: string;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
};

export type AmixClipSpec = ConcatClipSpec & {
  /** Per-clip gain in dB applied before amix. 0 = unity. */
  gainDb?: number;
};

export type ConcatExportPlan = {
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  filterComplex: string;
  estimatedDuration: number;
  spliceFade: number;
  args: string[];
  fallbackArgs: string[][];
};

export type AmixExportPlan = {
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  filterComplex: string;
  estimatedDuration: number;
  args: string[];
  fallbackArgs: string[][];
};

export const DEFAULT_SPLICE_FADE = 0.08;
export const MAX_SPLICE_FADE = 0.5;
export const MIN_GAIN_DB = -24;
export const MAX_GAIN_DB = 6;
export const DEFAULT_GAIN_DB = 0;

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clampNonNeg(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function channelLayout(channels: 1 | 2) {
  return channels === 1 ? "mono" : "stereo";
}

function aformatFilter(options: StreamFormatOptions) {
  return `aformat=sample_rates=${options.sampleRate}:channel_layouts=${channelLayout(options.channels)}`;
}

/** Max fade length for a selection: half the clip, capped (default 5s). */
export function maxFadeSeconds(selectionDuration: number, cap = 5) {
  if (!Number.isFinite(selectionDuration) || selectionDuration <= 0) return 0;
  return Math.min(cap, selectionDuration / 2);
}

/**
 * Clamp fade lengths so they fit inside the trimmed clip, then build an afade chain.
 * Fade times are relative to the trimmed output (after -ss/-to), so fade-in always starts at 0.
 */
export function trimFadeFilter(options: TrimFadeOptions): TrimFadeResult {
  const start = clampNonNeg(options.start);
  const end = Math.max(start, clampNonNeg(options.end));
  const duration = round3(Math.max(0, end - start));
  let fadeIn = round3(Math.min(clampNonNeg(options.fadeIn), duration));
  let fadeOut = round3(Math.min(clampNonNeg(options.fadeOut), duration));

  if (fadeIn + fadeOut > duration) {
    const scale = duration / (fadeIn + fadeOut);
    fadeIn = round3(fadeIn * scale);
    fadeOut = round3(Math.max(0, duration - fadeIn));
  }

  const fadeOutStart = round3(Math.max(0, duration - fadeOut));
  const parts: string[] = [];
  if (fadeIn > 0) parts.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0) parts.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);

  return {
    duration,
    fadeIn,
    fadeOut,
    fadeOutStart,
    filter: parts.join(","),
  };
}

/**
 * Decide whether stream copy is safe: MP3 out, no fades, and export rate/channels match the source.
 * Bitrate changes always require a re-encode (copy cannot apply a new bitrate).
 */
export function canTrimStreamCopy(options: {
  format: AudioExportFormat;
  fadeFilter: string;
  settings: AudioExportSettings;
  sourceSampleRate?: number | null;
  sourceChannels?: number | null;
  bitrateUnchanged?: boolean;
}): boolean {
  if (options.format !== "mp3") return false;
  if (options.fadeFilter) return false;
  if (options.bitrateUnchanged === false) return false;
  const settings = clampAudioExportSettings(options.format, options.settings);
  if (settings.mp3Mode !== "cbr") return false;
  if (options.sourceSampleRate != null && options.sourceSampleRate > 0 && settings.sampleRate !== options.sourceSampleRate) {
    return false;
  }
  if (options.sourceChannels != null && options.sourceChannels > 0) {
    const sourceChannels = options.sourceChannels >= 2 ? 2 : 1;
    if (settings.channels !== sourceChannels) return false;
  }
  return true;
}

/** Build FFmpeg args for a single-file trim (+ optional fades) and export. */
export function buildTrimExportPlan(options: {
  inputName: string;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  format: AudioExportFormat;
  settings: AudioExportSettings;
  sourceSampleRate?: number | null;
  sourceChannels?: number | null;
  /** When false, never attempt `-c copy` (e.g. user changed bitrate). Default true. */
  bitrateUnchanged?: boolean;
}): TrimExportPlan {
  const format = options.format;
  const settings = clampAudioExportSettings(format, options.settings);
  const fade = trimFadeFilter({
    start: options.start,
    end: options.end,
    fadeIn: options.fadeIn,
    fadeOut: options.fadeOut,
  });
  const startArg = round3(Math.max(0, options.start)).toFixed(3);
  const endArg = round3(Math.max(options.start, options.end)).toFixed(3);
  const outputName = audioExportOutputName(format);
  const mimeType = audioExportMimeType(format);
  const codec = audioCodecArgs(format, settings);
  const filterArgs = fade.filter ? ["-af", fade.filter] : [];

  const reencode = ["-i", options.inputName, "-ss", startArg, "-to", endArg, ...filterArgs, "-vn", ...codec, outputName];
  const reencodeUnmapped = ["-i", options.inputName, "-ss", startArg, "-to", endArg, ...filterArgs, ...codec, outputName];

  const allowCopy = canTrimStreamCopy({
    format,
    fadeFilter: fade.filter,
    settings,
    sourceSampleRate: options.sourceSampleRate,
    sourceChannels: options.sourceChannels,
    bitrateUnchanged: options.bitrateUnchanged,
  });

  return {
    fade,
    canStreamCopy: allowCopy,
    outputName,
    mimeType,
    extension: format,
    copyArgs: allowCopy ? ["-i", options.inputName, "-ss", startArg, "-to", endArg, "-c", "copy", outputName] : null,
    args: reencode,
    fallbackArgs: [reencodeUnmapped],
  };
}

/**
 * Build a filter_complex that normalizes each input, then concatenates (or crossfades) them.
 * Labels: inputs `0:a`..`n-1:a`, final output `[out]`.
 */
export function concatFilter(n: number, options: ConcatFilterOptions): string {
  const count = Math.max(1, Math.floor(n));
  const spliceFade = round3(clampNonNeg(options.spliceFade));
  const format = aformatFilter(options);
  const labeled: string[] = [];

  for (let index = 0; index < count; index += 1) {
    labeled.push(`[${index}:a]${format}[a${index}]`);
  }

  if (count === 1) {
    return `${labeled[0]};[a0]anull[out]`;
  }

  if (spliceFade <= 0) {
    const inputs = Array.from({ length: count }, (_, index) => `[a${index}]`).join("");
    return `${labeled.join(";")};${inputs}concat=n=${count}:v=0:a=1[out]`;
  }

  // Chain acrossfade: a0+a1 -> x1, x1+a2 -> x2, ...
  const steps: string[] = [...labeled];
  let previous = "a0";
  for (let index = 1; index < count; index += 1) {
    const nextLabel = index === count - 1 ? "out" : `x${index}`;
    steps.push(`[${previous}][a${index}]acrossfade=d=${spliceFade}:c1=tri:c2=tri[${nextLabel}]`);
    previous = nextLabel;
  }
  return steps.join(";");
}

/** Clamp mix gain to a usable dB range. */
export function clampGainDb(gainDb: number): number {
  if (!Number.isFinite(gainDb)) return DEFAULT_GAIN_DB;
  return round3(Math.min(MAX_GAIN_DB, Math.max(MIN_GAIN_DB, gainDb)));
}

/**
 * Per-input prep: trim selection, reset timestamps, optional fades/gain, then normalize sample format.
 * Output label is `[a{index}]`.
 */
export function clipPrepFilter(
  index: number,
  clip: Omit<AmixClipSpec, "inputName">,
  stream: StreamFormatOptions,
): string {
  const fade = trimFadeFilter({
    start: clip.start,
    end: clip.end,
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
  });
  const start = round3(Math.max(0, clip.start));
  const end = round3(Math.max(start, clip.end));
  const gainDb = clampGainDb(clip.gainDb ?? DEFAULT_GAIN_DB);
  const parts = [`atrim=start=${start}:end=${end}`, "asetpts=PTS-STARTPTS"];
  if (fade.filter) parts.push(fade.filter);
  if (gainDb !== 0) parts.push(`volume=${gainDb}dB`);
  parts.push(aformatFilter(stream));
  return `[${index}:a]${parts.join(",")}[a${index}]`;
}

/** Clamp splice fade to [0, MAX_SPLICE_FADE] and below the shortest clip duration. */
export function clampSpliceFade(spliceFade: number, clipDurations: number[]): number {
  const positive = clipDurations.map(clampNonNeg).filter((duration) => duration > 0);
  const shortest = positive.length ? Math.min(...positive) : MAX_SPLICE_FADE;
  const cap = Math.min(MAX_SPLICE_FADE, shortest * 0.45);
  return round3(Math.min(cap, Math.max(0, clampNonNeg(spliceFade))));
}

/**
 * Full concat graph: prep each trimmed clip, then hard-concat or acrossfade into `[out]`.
 */
export function buildConcatGraph(clips: Array<Omit<ConcatClipSpec, "inputName">>, options: ConcatFilterOptions): string {
  if (!clips.length) return "[0:a]anull[out]";
  const stream = { sampleRate: options.sampleRate, channels: options.channels };
  const durations = clips.map((clip) => trimFadeFilter(clip).duration);
  const spliceFade = clampSpliceFade(options.spliceFade, durations);
  const preps = clips.map((clip, index) => clipPrepFilter(index, clip, stream));

  if (clips.length === 1) {
    return `${preps[0]};[a0]anull[out]`;
  }

  if (spliceFade <= 0) {
    const inputs = Array.from({ length: clips.length }, (_, index) => `[a${index}]`).join("");
    return `${preps.join(";")};${inputs}concat=n=${clips.length}:v=0:a=1[out]`;
  }

  const steps = [...preps];
  let previous = "a0";
  for (let index = 1; index < clips.length; index += 1) {
    const nextLabel = index === clips.length - 1 ? "out" : `x${index}`;
    steps.push(`[${previous}][a${index}]acrossfade=d=${spliceFade}:c1=tri:c2=tri[${nextLabel}]`);
    previous = nextLabel;
  }
  return steps.join(";");
}

/** Build multi-input FFmpeg args that join trimmed clips in order. */
export function buildConcatExportPlan(options: {
  clips: ConcatClipSpec[];
  format: AudioExportFormat;
  settings: AudioExportSettings;
  spliceFade: number;
}): ConcatExportPlan {
  if (!options.clips.length) {
    throw new Error("buildConcatExportPlan requires at least one clip.");
  }

  const format = options.format;
  const settings = clampAudioExportSettings(format, options.settings);
  const stream = { sampleRate: settings.sampleRate, channels: settings.channels };
  const durations = options.clips.map((clip) => trimFadeFilter(clip).duration);
  const spliceFade = clampSpliceFade(options.spliceFade, durations);
  const filterComplex = buildConcatGraph(
    options.clips.map(({ start, end, fadeIn, fadeOut }) => ({ start, end, fadeIn, fadeOut })),
    { ...stream, spliceFade },
  );
  const outputName = audioExportOutputName(format);
  const mimeType = audioExportMimeType(format);
  const codec = audioCodecArgs(format, settings);
  const inputArgs = options.clips.flatMap((clip) => ["-i", clip.inputName]);
  const mapped = [...inputArgs, "-filter_complex", filterComplex, "-map", "[out]", "-vn", ...codec, outputName];
  const unmapped = [...inputArgs, "-filter_complex", filterComplex, "-vn", ...codec, outputName];

  return {
    outputName,
    mimeType,
    extension: format,
    filterComplex,
    estimatedDuration: estimateConcatDuration(durations, spliceFade),
    spliceFade,
    args: mapped,
    fallbackArgs: [unmapped],
  };
}

/**
 * Build a filter_complex that normalizes each input and mixes them with amix.
 * Labels: inputs `0:a`..`n-1:a`, final output `[out]`.
 * `normalize` defaults to false (no per-input attenuation) for the bare helper.
 */
export function amixFilter(n: number, options: AmixFilterOptions & { normalize?: boolean }): string {
  const count = Math.max(1, Math.floor(n));
  const format = aformatFilter(options);
  const normalize = options.normalize ? 1 : 0;
  const labeled: string[] = [];

  for (let index = 0; index < count; index += 1) {
    labeled.push(`[${index}:a]${format}[a${index}]`);
  }

  if (count === 1) {
    return `${labeled[0]};[a0]anull[out]`;
  }

  const inputs = Array.from({ length: count }, (_, index) => `[a${index}]`).join("");
  return `${labeled.join(";")};${inputs}amix=inputs=${count}:duration=longest:dropout_transition=0:normalize=${normalize}[out]`;
}

/**
 * Full mix graph: prep each trimmed clip (optional gain), then amix into `[out]`.
 * Uses normalize=1 so stacked full-level clips do not clip by default.
 */
export function buildAmixGraph(clips: Array<Omit<AmixClipSpec, "inputName">>, options: AmixFilterOptions): string {
  if (!clips.length) return "[0:a]anull[out]";
  const stream = { sampleRate: options.sampleRate, channels: options.channels };
  const preps = clips.map((clip, index) => clipPrepFilter(index, clip, stream));

  if (clips.length === 1) {
    return `${preps[0]};[a0]anull[out]`;
  }

  const inputs = Array.from({ length: clips.length }, (_, index) => `[a${index}]`).join("");
  return `${preps.join(";")};${inputs}amix=inputs=${clips.length}:duration=longest:dropout_transition=0:normalize=1[out]`;
}

/** Build multi-input FFmpeg args that overlay trimmed clips (amix). */
export function buildAmixExportPlan(options: {
  clips: AmixClipSpec[];
  format: AudioExportFormat;
  settings: AudioExportSettings;
}): AmixExportPlan {
  if (!options.clips.length) {
    throw new Error("buildAmixExportPlan requires at least one clip.");
  }

  const format = options.format;
  const settings = clampAudioExportSettings(format, options.settings);
  const stream = { sampleRate: settings.sampleRate, channels: settings.channels };
  const durations = options.clips.map((clip) => trimFadeFilter(clip).duration);
  const filterComplex = buildAmixGraph(
    options.clips.map(({ start, end, fadeIn, fadeOut, gainDb }) => ({
      start,
      end,
      fadeIn,
      fadeOut,
      gainDb,
    })),
    stream,
  );
  const outputName = audioExportOutputName(format);
  const mimeType = audioExportMimeType(format);
  const codec = audioCodecArgs(format, settings);
  const inputArgs = options.clips.flatMap((clip) => ["-i", clip.inputName]);
  const mapped = [...inputArgs, "-filter_complex", filterComplex, "-map", "[out]", "-vn", ...codec, outputName];
  const unmapped = [...inputArgs, "-filter_complex", filterComplex, "-vn", ...codec, outputName];

  return {
    outputName,
    mimeType,
    extension: format,
    filterComplex,
    estimatedDuration: estimateAmixDuration(durations),
    args: mapped,
    fallbackArgs: [unmapped],
  };
}

/** Approximate output duration for concat with optional splice crossfade. */
export function estimateConcatDuration(clipDurations: number[], spliceFade: number): number {
  if (!clipDurations.length) return 0;
  const fade = clampNonNeg(spliceFade);
  const sum = clipDurations.reduce((total, value) => total + clampNonNeg(value), 0);
  return round3(Math.max(0, sum - fade * Math.max(0, clipDurations.length - 1)));
}

/** Approximate output duration for amix (longest clip). */
export function estimateAmixDuration(clipDurations: number[]): number {
  if (!clipDurations.length) return 0;
  return round3(Math.max(0, ...clipDurations.map(clampNonNeg)));
}
