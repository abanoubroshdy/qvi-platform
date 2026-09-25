export const videoContainers = ["mp4", "webm", "mkv", "mov", "avi", "gif"] as const;
export type VideoContainer = (typeof videoContainers)[number];

export const videoCodecs = ["h264", "vp9", "vp8", "mpeg4"] as const;
export type VideoCodec = (typeof videoCodecs)[number];

export const videoScales = ["original", "1080", "720", "480", "360"] as const;
export type VideoScale = (typeof videoScales)[number];

export const videoFrameRates = ["original", "60", "30", "24", "15", "12"] as const;
export type VideoFrameRate = (typeof videoFrameRates)[number];

export const videoBitrates = [800, 1500, 2500, 4000, 6000] as const;

export type VideoQualityMode = "crf" | "bitrate";
export type VideoAudioPolicy = "keep" | "remove";
export type VideoEncodeMode = "transcode" | "remux";

export type VideoConvertSettings = {
  container: VideoContainer;
  codec: VideoCodec;
  scale: VideoScale;
  fps: VideoFrameRate;
  qualityMode: VideoQualityMode;
  crf: number;
  videoBitrate: number;
  audio: VideoAudioPolicy;
  mode: VideoEncodeMode;
};

export type VideoConvertSpec = {
  outputName: string;
  mimeType: string;
  extension: VideoContainer;
  args: string[];
  fallbackArgs: string[][];
};

const mimeTypes: Record<VideoContainer, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  gif: "image/gif",
};

export const defaultVideoConvertSettings: VideoConvertSettings = {
  container: "mp4",
  codec: "h264",
  scale: "original",
  fps: "original",
  qualityMode: "crf",
  crf: 23,
  videoBitrate: 2500,
  audio: "keep",
  mode: "transcode",
};

export function codecsFor(container: VideoContainer): VideoCodec[] {
  switch (container) {
    case "mp4":
    case "mov":
      return ["h264"];
    case "webm":
      return ["vp9", "vp8"];
    case "mkv":
      return ["h264", "vp9"];
    case "avi":
      return ["mpeg4"];
    case "gif":
      return [];
  }
}

export function defaultCodec(container: VideoContainer): VideoCodec {
  return codecsFor(container)[0] ?? "h264";
}

export function defaultCrf(codec: VideoCodec): number {
  if (codec === "vp9" || codec === "vp8") return 32;
  return 23;
}

/** mpeg4 qscale (lower is better) derived from the shared CRF control. */
export function mpeg4QScale(crf: number): number {
  return Math.min(20, Math.max(2, Math.round(crf / 2) - 6));
}

export function clampVideoConvertSettings(settings: VideoConvertSettings): VideoConvertSettings {
  const codecs = codecsFor(settings.container);
  const codec = codecs.includes(settings.codec) ? settings.codec : defaultCodec(settings.container);
  const crf = Math.min(40, Math.max(18, Math.round(Number.isFinite(settings.crf) ? settings.crf : 23)));
  const videoBitrate = (videoBitrates as readonly number[]).includes(settings.videoBitrate) ? settings.videoBitrate : 2500;
  return {
    container: settings.container,
    codec,
    scale: (videoScales as readonly string[]).includes(settings.scale) ? settings.scale : "original",
    fps: (videoFrameRates as readonly string[]).includes(settings.fps) ? settings.fps : "original",
    qualityMode: settings.qualityMode === "bitrate" ? "bitrate" : "crf",
    crf,
    videoBitrate,
    audio: settings.audio === "remove" ? "remove" : "keep",
    mode: settings.container === "gif" ? "transcode" : settings.mode === "remux" ? "remux" : "transcode",
  };
}

function videoEncoderArgs(settings: VideoConvertSettings): string[] {
  const { codec, qualityMode, crf, videoBitrate } = settings;
  if (codec === "h264") {
    const quality =
      qualityMode === "bitrate"
        ? ["-b:v", `${videoBitrate}k`, "-maxrate", `${videoBitrate}k`, "-bufsize", `${videoBitrate * 2}k`]
        : ["-crf", String(crf)];
    return ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", ...quality];
  }
  if (codec === "vp9") {
    const quality = qualityMode === "bitrate" ? ["-b:v", `${videoBitrate}k`] : ["-crf", String(crf), "-b:v", "0"];
    return ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-pix_fmt", "yuv420p", ...quality];
  }
  if (codec === "vp8") {
    const quality =
      qualityMode === "bitrate"
        ? ["-b:v", `${videoBitrate}k`]
        : ["-crf", String(Math.min(63, crf)), "-b:v", `${videoBitrate}k`];
    return ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "4", "-pix_fmt", "yuv420p", ...quality];
  }
  if (qualityMode === "bitrate") {
    return ["-c:v", "mpeg4", "-pix_fmt", "yuv420p", "-b:v", `${videoBitrate}k`];
  }
  return ["-c:v", "mpeg4", "-pix_fmt", "yuv420p", "-q:v", String(mpeg4QScale(crf))];
}

function audioEncoderArgs(settings: VideoConvertSettings): string[] {
  if (settings.audio === "remove" || settings.container === "gif") return ["-an"];
  if (settings.container === "webm" || settings.codec === "vp9" || settings.codec === "vp8") {
    return ["-c:a", "libopus", "-b:a", "128k", "-ar", "48000", "-ac", "2"];
  }
  if (settings.container === "avi") {
    return ["-c:a", "libmp3lame", "-b:a", "160k", "-ar", "44100", "-ac", "2"];
  }
  return ["-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2"];
}

function filterGraph(settings: VideoConvertSettings): string | null {
  if (settings.container === "gif") {
    const fps = settings.fps === "original" ? 12 : Number(settings.fps);
    const scale = settings.scale === "original" ? "" : `scale=-2:${settings.scale}:flags=lanczos,`;
    return `${scale}fps=${fps},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse`;
  }
  const parts: string[] = [];
  if (settings.scale !== "original") parts.push(`scale=-2:${settings.scale}:flags=lanczos`);
  if (settings.fps !== "original") parts.push(`fps=${settings.fps}`);
  return parts.length ? parts.join(",") : null;
}

function fastStart(container: VideoContainer): string[] {
  return container === "mp4" || container === "mov" ? ["-movflags", "+faststart"] : [];
}

/** Build ffmpeg args for a container change, including a stream-copy remux path. */
export function videoConvertSpec(inputName: string, raw: VideoConvertSettings): VideoConvertSpec {
  const settings = clampVideoConvertSettings(raw);
  const extension = settings.container;
  const outputName = `output.${extension}`;
  const mimeType = mimeTypes[extension];

  if (settings.mode === "remux") {
    const args = ["-y", "-i", inputName, "-c", "copy", "-sn"];
    if (settings.audio === "remove") args.push("-an");
    args.push(...fastStart(extension), outputName);
    return { outputName, mimeType, extension, args, fallbackArgs: [] };
  }

  if (extension === "gif") {
    const args = ["-y", "-i", inputName, "-map", "0:v:0", "-an", "-sn", "-vf", filterGraph(settings)!, "-loop", "0", outputName];
    return { outputName, mimeType, extension, args, fallbackArgs: [] };
  }

  const filter = filterGraph(settings);
  const tail = [
    ...(filter ? ["-vf", filter] : []),
    ...videoEncoderArgs(settings),
    ...audioEncoderArgs(settings),
    ...fastStart(extension),
    outputName,
  ];
  const audioMap = settings.audio === "keep" ? ["-map", "0:a:0?"] : [];
  return {
    outputName,
    mimeType,
    extension,
    args: ["-y", "-i", inputName, "-map", "0:v:0", ...audioMap, "-sn", ...tail],
    fallbackArgs: [["-y", "-i", inputName, "-sn", ...tail]],
  };
}
