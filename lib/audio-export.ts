export const audioExportFormats = ["mp3", "wav", "m4a", "ogg", "flac"] as const;

export type AudioExportFormat = (typeof audioExportFormats)[number];

export type AudioExportSpec = {
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  args: string[];
  fallbackArgs: string[][];
};

function command(inputName: string, outputName: string, codec: string[], mapped: boolean): string[] {
  return mapped
    ? ["-i", inputName, "-vn", "-map", "0:a:0", ...codec, outputName]
    : ["-i", inputName, "-vn", ...codec, outputName];
}

const codecs: Record<AudioExportFormat, { outputName: string; mimeType: string; codec: string[] }> = {
  mp3: {
    outputName: "output.mp3",
    mimeType: "audio/mpeg",
    codec: ["-c:a", "libmp3lame", "-q:a", "2", "-ar", "44100", "-ac", "2"],
  },
  wav: {
    outputName: "output.wav",
    mimeType: "audio/wav",
    codec: ["-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2"],
  },
  m4a: {
    outputName: "output.m4a",
    mimeType: "audio/mp4",
    codec: ["-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2"],
  },
  ogg: {
    outputName: "output.ogg",
    mimeType: "audio/ogg",
    codec: ["-c:a", "libvorbis", "-q:a", "5", "-ar", "44100", "-ac", "2"],
  },
  flac: {
    outputName: "output.flac",
    mimeType: "audio/flac",
    codec: ["-c:a", "flac", "-compression_level", "5", "-ar", "44100", "-ac", "2"],
  },
};

export function audioExportSpec(format: AudioExportFormat, inputName: string): AudioExportSpec {
  const { outputName, mimeType, codec } = codecs[format];
  return {
    outputName,
    mimeType,
    extension: format,
    args: command(inputName, outputName, codec, true),
    fallbackArgs: [command(inputName, outputName, codec, false)],
  };
}
