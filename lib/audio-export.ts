export const audioExportFormats = ["mp3", "wav", "m4a", "ogg", "flac"] as const;

export type AudioExportFormat = (typeof audioExportFormats)[number];

export type AudioExportSettings = {
  sampleRate: number;
  channels: 1 | 2;
  bitrate: number;
  mp3Mode: "cbr" | "vbr";
  vbrQuality: number;
  wavBitDepth: 16 | 24;
  flacLevel: number;
};

export type AudioExportSpec = {
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  args: string[];
  fallbackArgs: string[][];
};

export const defaultAudioExportSettings: AudioExportSettings = {
  sampleRate: 44100,
  channels: 2,
  bitrate: 192,
  mp3Mode: "cbr",
  vbrQuality: 5,
  wavBitDepth: 16,
  flacLevel: 5,
};

export const mp3Bitrates = [96, 128, 192, 256, 320] as const;
export const aacBitrates = [96, 128, 192, 256] as const;

const mimeTypes: Record<AudioExportFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export function sampleRatesFor(format: AudioExportFormat): number[] {
  if (format === "mp3") return [22050, 44100, 48000];
  if (format === "m4a" || format === "ogg") return [44100, 48000];
  return [44100, 48000, 96000];
}

export function clampAudioExportSettings(format: AudioExportFormat, settings: AudioExportSettings): AudioExportSettings {
  const rates = sampleRatesFor(format);
  const sampleRate = rates.includes(settings.sampleRate) ? settings.sampleRate : 44100;
  const bitrateList: readonly number[] = format === "m4a" ? aacBitrates : mp3Bitrates;
  const bitrate = bitrateList.includes(settings.bitrate) ? settings.bitrate : 192;
  const maxVbr = format === "ogg" ? 10 : 9;
  return {
    ...settings,
    sampleRate,
    bitrate,
    vbrQuality: Math.min(maxVbr, Math.max(0, settings.vbrQuality)),
    flacLevel: Math.min(12, Math.max(0, settings.flacLevel)),
  };
}

function command(inputName: string, outputName: string, codec: string[], mapped: boolean): string[] {
  return mapped
    ? ["-i", inputName, "-vn", "-map", "0:a:0", ...codec, outputName]
    : ["-i", inputName, "-vn", ...codec, outputName];
}

function codecArgs(format: AudioExportFormat, settings: AudioExportSettings): string[] {
  const io = ["-ar", String(settings.sampleRate), "-ac", String(settings.channels)];
  switch (format) {
    case "mp3":
      return settings.mp3Mode === "vbr"
        ? ["-c:a", "libmp3lame", "-q:a", String(settings.vbrQuality), ...io]
        : ["-c:a", "libmp3lame", "-b:a", `${settings.bitrate}k`, ...io];
    case "wav":
      return ["-c:a", settings.wavBitDepth === 24 ? "pcm_s24le" : "pcm_s16le", ...io];
    case "m4a":
      return ["-c:a", "aac", "-b:a", `${settings.bitrate}k`, ...io];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", String(settings.vbrQuality), ...io];
    case "flac":
      return ["-c:a", "flac", "-compression_level", String(settings.flacLevel), ...io];
  }
}

/** Codec and sample-format flags for an already-selected input (no `-i`). */
export function audioCodecArgs(format: AudioExportFormat, settings: AudioExportSettings): string[] {
  return codecArgs(format, clampAudioExportSettings(format, settings));
}

export function audioExportMimeType(format: AudioExportFormat): string {
  return mimeTypes[format];
}

export function audioExportOutputName(format: AudioExportFormat): string {
  return `output.${format}`;
}

export function audioExportSpec(format: AudioExportFormat, inputName: string, settings: AudioExportSettings): AudioExportSpec {
  const outputName = `output.${format}`;
  const codec = codecArgs(format, clampAudioExportSettings(format, settings));
  return {
    outputName,
    mimeType: mimeTypes[format],
    extension: format,
    args: command(inputName, outputName, codec, true),
    fallbackArgs: [command(inputName, outputName, codec, false)],
  };
}
