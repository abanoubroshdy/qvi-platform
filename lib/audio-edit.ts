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

/**
 * Build a filter_complex that normalizes each input and mixes them with amix.
 * Labels: inputs `0:a`..`n-1:a`, final output `[out]`.
 */
export function amixFilter(n: number, options: AmixFilterOptions): string {
  const count = Math.max(1, Math.floor(n));
  const format = aformatFilter(options);
  const labeled: string[] = [];

  for (let index = 0; index < count; index += 1) {
    labeled.push(`[${index}:a]${format}[a${index}]`);
  }

  if (count === 1) {
    return `${labeled[0]};[a0]anull[out]`;
  }

  const inputs = Array.from({ length: count }, (_, index) => `[a${index}]`).join("");
  return `${labeled.join(";")};${inputs}amix=inputs=${count}:duration=longest:dropout_transition=0:normalize=0[out]`;
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
