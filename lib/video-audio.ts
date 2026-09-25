import {
  aacBitrates,
  audioExportSpec,
  clampAudioExportSettings,
  mp3Bitrates,
  type AudioExportSettings,
} from "@/lib/audio-export";

export const videoAudioFormats = ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "aiff", "wma"] as const;

export type VideoAudioFormat = (typeof videoAudioFormats)[number];

const legacyAudioFormats = ["mp3", "wav", "m4a", "ogg", "flac"] as const;
type LegacyAudioFormat = (typeof legacyAudioFormats)[number];

const lossyBitrates = [64, 96, 128, 160, 192] as const;

const mimeTypes: Record<VideoAudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  aiff: "audio/aiff",
  wma: "audio/x-ms-wma",
};

export function isLegacyAudioFormat(format: VideoAudioFormat): format is LegacyAudioFormat {
  return (legacyAudioFormats as readonly string[]).includes(format);
}

export function videoAudioSampleRates(format: VideoAudioFormat): number[] {
  if (format === "opus") return [48000, 24000, 16000];
  if (format === "mp3") return [22050, 44100, 48000];
  if (format === "m4a" || format === "aac" || format === "ogg" || format === "wma") return [44100, 48000];
  return [44100, 48000, 96000];
}

export function videoAudioBitrates(format: VideoAudioFormat): readonly number[] {
  if (format === "opus" || format === "wma") return lossyBitrates;
  if (format === "aac" || format === "m4a") return aacBitrates;
  return mp3Bitrates;
}

export function clampVideoAudioSettings(format: VideoAudioFormat, settings: AudioExportSettings): AudioExportSettings {
  const rates = videoAudioSampleRates(format);
  const sampleRate = rates.includes(settings.sampleRate) ? settings.sampleRate : rates[0];
  const bitrateList = videoAudioBitrates(format);
  const bitrate = bitrateList.includes(settings.bitrate) ? settings.bitrate : bitrateList.includes(128) ? 128 : bitrateList[0];
  const base = isLegacyAudioFormat(format) ? clampAudioExportSettings(format, { ...settings, sampleRate, bitrate }) : settings;
  return {
    ...base,
    sampleRate,
    bitrate,
    channels: settings.channels === 1 ? 1 : 2,
    wavBitDepth: settings.wavBitDepth === 24 ? 24 : 16,
    flacLevel: Math.min(12, Math.max(0, settings.flacLevel)),
    vbrQuality: Math.min(format === "ogg" ? 10 : 9, Math.max(0, settings.vbrQuality)),
  };
}

export type VideoAudioSpec = {
  outputName: string;
  mimeType: string;
  extension: VideoAudioFormat;
  args: string[];
  fallbackArgs: string[][];
};

function command(inputName: string, outputName: string, codec: string[], mapped: boolean): string[] {
  return mapped
    ? ["-i", inputName, "-vn", "-map", "0:a:0", ...codec, outputName]
    : ["-i", inputName, "-vn", ...codec, outputName];
}

/** FFmpeg args that extract one audio stream from a video into the chosen format. */
export function videoAudioExportSpec(
  format: VideoAudioFormat,
  inputName: string,
  settings: AudioExportSettings,
): VideoAudioSpec {
  const clamped = clampVideoAudioSettings(format, settings);
  if (isLegacyAudioFormat(format)) {
    const spec = audioExportSpec(format, inputName, clamped);
    return {
      outputName: spec.outputName,
      mimeType: spec.mimeType,
      extension: format,
      args: spec.args,
      fallbackArgs: spec.fallbackArgs,
    };
  }

  const outputName = `output.${format}`;
  const io = ["-ar", String(clamped.sampleRate), "-ac", String(clamped.channels)];
  const codec =
    format === "aac"
      ? ["-c:a", "aac", "-b:a", `${clamped.bitrate}k`, ...io]
      : format === "opus"
        ? ["-c:a", "libopus", "-b:a", `${clamped.bitrate}k`, ...io]
        : format === "aiff"
          ? ["-c:a", clamped.wavBitDepth === 24 ? "pcm_s24be" : "pcm_s16be", ...io]
          : ["-c:a", "wmav2", "-b:a", `${clamped.bitrate}k`, ...io];

  const fallbacks = [command(inputName, outputName, codec, false)];
  if (format === "wma") {
    fallbacks.push(command(inputName, outputName, ["-c:a", "wmav2", "-strict", "experimental", "-b:a", `${clamped.bitrate}k`, ...io], false));
  }

  return {
    outputName,
    mimeType: mimeTypes[format],
    extension: format,
    args: command(inputName, outputName, codec, true),
    fallbackArgs: fallbacks,
  };
}
