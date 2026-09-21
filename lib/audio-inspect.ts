export type AudioContainerFormat = "mp3" | "wav" | "m4a" | "ogg" | "flac" | "aac" | "unknown";

export type AudioSourceInfo = {
  duration: number;
  sampleRate: number;
  channels: number;
  format: AudioContainerFormat;
  bytes: number;
  /** Approximate bitrate in kbps from file size and duration. Null when duration is too short. */
  estimatedKbps: number | null;
};

const FORMAT_BY_EXT: Record<string, AudioContainerFormat> = {
  mp3: "mp3",
  wav: "wav",
  wave: "wav",
  m4a: "m4a",
  aac: "aac",
  ogg: "ogg",
  oga: "ogg",
  flac: "flac",
};

const FORMAT_BY_MIME: Record<string, AudioContainerFormat> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

export function detectAudioFormat(file: Pick<File, "name" | "type">): AudioContainerFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext && FORMAT_BY_EXT[ext]) return FORMAT_BY_EXT[ext];
  const mime = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime && FORMAT_BY_MIME[mime]) return FORMAT_BY_MIME[mime];
  return "unknown";
}

export function estimateKbps(bytes: number, durationSeconds: number): number | null {
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.05) return null;
  return Math.round((bytes * 8) / durationSeconds / 1000);
}

export function inspectAudioBuffer(
  file: Pick<File, "name" | "type" | "size">,
  buffer: Pick<AudioBuffer, "duration" | "sampleRate" | "numberOfChannels">,
): AudioSourceInfo {
  const duration = Math.max(0, buffer.duration);
  return {
    duration,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    format: detectAudioFormat(file),
    bytes: file.size,
    estimatedKbps: estimateKbps(file.size, duration),
  };
}

/** Human-readable sample rate, e.g. "44.1 kHz". */
export function formatSampleRateLabel(sampleRate: number): string {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return "—";
  if (sampleRate >= 1000) {
    return `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`;
  }
  return `${sampleRate} Hz`;
}

/** Human-readable quality line, e.g. "44.1 kHz · stereo · ~192 kbps · MP3". */
export function formatAudioSourceSummary(info: AudioSourceInfo): string {
  const rate = formatSampleRateLabel(info.sampleRate);
  const channels = info.channels <= 1 ? "mono" : info.channels === 2 ? "stereo" : `${info.channels} ch`;
  const bitrate = info.estimatedKbps != null ? `~${info.estimatedKbps} kbps` : null;
  const format = info.format === "unknown" ? null : info.format.toUpperCase();
  return [rate, channels, bitrate, format].filter(Boolean).join(" · ");
}

/** Short export target line, e.g. "320 kbps / 48 kHz · MP3". */
export function formatAudioExportSummary(options: {
  sampleRate: number;
  format: string;
  bitrateKbps?: number | null;
  bitDepth?: number | null;
}): string {
  const rate = formatSampleRateLabel(options.sampleRate);
  const quality =
    options.bitrateKbps != null
      ? `${options.bitrateKbps} kbps`
      : options.bitDepth != null
        ? `${options.bitDepth}-bit`
        : null;
  const left = [quality, rate].filter(Boolean).join(" / ");
  return [left, options.format.toUpperCase()].filter(Boolean).join(" · ");
}
