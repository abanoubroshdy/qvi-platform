import { describe, expect, it } from "vitest";
import {
  clampVideoConvertSettings,
  defaultVideoConvertSettings,
  mpeg4QScale,
  videoConvertSpec,
} from "@/lib/video-convert";

describe("videoConvertSpec", () => {
  it("transcodes to MP4 with H.264, AAC, and faststart", () => {
    const spec = videoConvertSpec("in0.webm", defaultVideoConvertSettings);
    expect(spec.extension).toBe("mp4");
    expect(spec.mimeType).toBe("video/mp4");
    expect(spec.args).toEqual([
      "-y",
      "-i",
      "in0.webm",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-sn",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
    expect(spec.args).not.toContain("copy");
  });

  it("applies scale, fps, and bitrate when requested", () => {
    const spec = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      scale: "720",
      fps: "30",
      qualityMode: "bitrate",
      videoBitrate: 1500,
      audio: "remove",
    });
    expect(spec.args).toContain("-vf");
    expect(spec.args).toContain("scale=-2:720:flags=lanczos,fps=30");
    expect(spec.args).toContain("1500k");
    expect(spec.args).toContain("-an");
    expect(spec.args).not.toContain("aac");
    expect(spec.args).not.toContain("0:a:0?");
  });

  it("remuxes with stream copy and can drop audio", () => {
    const spec = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      container: "mkv",
      mode: "remux",
      audio: "remove",
      scale: "480",
    });
    expect(spec.args).toEqual(["-y", "-i", "in0.mp4", "-c", "copy", "-sn", "-an", "output.mkv"]);
    expect(spec.args).not.toContain("libx264");
    expect(spec.args.join(" ")).not.toContain("scale=");
  });

  it("encodes WebM with VP9 and Opus, and can switch to VP8", () => {
    const vp9 = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      container: "webm",
      codec: "vp9",
      crf: 32,
    });
    expect(vp9.args).toContain("libvpx-vp9");
    expect(vp9.args).toContain("libopus");
    expect(vp9.args).toContain("48000");
    expect(vp9.mimeType).toBe("video/webm");

    const vp8 = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      container: "webm",
      codec: "vp8",
      qualityMode: "crf",
      crf: 32,
      videoBitrate: 800,
    });
    expect(vp8.args).toContain("libvpx");
    expect(vp8.args).not.toContain("libvpx-vp9");
  });

  it("uses mpeg4 and MP3 for AVI and maps CRF to qscale", () => {
    expect(mpeg4QScale(23)).toBe(6);
    const spec = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      container: "avi",
      codec: "h264",
      crf: 23,
    });
    expect(spec.args).toContain("mpeg4");
    expect(spec.args).toContain("-q:v");
    expect(spec.args).toContain("6");
    expect(spec.args).toContain("libmp3lame");
    expect(spec.extension).toBe("avi");
  });

  it("builds a palette GIF and refuses remux", () => {
    const spec = videoConvertSpec("in0.mp4", {
      ...defaultVideoConvertSettings,
      container: "gif",
      mode: "remux",
      scale: "360",
      fps: "12",
      audio: "keep",
    });
    expect(spec.extension).toBe("gif");
    expect(spec.args).toContain("-loop");
    expect(spec.args).toContain("0");
    expect(spec.args).toContain("-an");
    const filter = spec.args[spec.args.indexOf("-vf") + 1];
    expect(filter).toContain("scale=-2:360:flags=lanczos");
    expect(filter).toContain("fps=12");
    expect(filter).toContain("palettegen");
    expect(spec.args).not.toContain("copy");
  });

  it("uses 12 fps for GIF when frame rate stays on original", () => {
    const spec = videoConvertSpec("in0.mov", { ...defaultVideoConvertSettings, container: "gif" });
    const filter = spec.args[spec.args.indexOf("-vf") + 1];
    expect(filter.startsWith("fps=12,")).toBe(true);
  });

  it("clamps an incompatible codec back to the container default", () => {
    const clamped = clampVideoConvertSettings({
      ...defaultVideoConvertSettings,
      container: "mp4",
      codec: "vp9",
      mode: "remux",
    });
    expect(clamped.codec).toBe("h264");
    expect(clamped.mode).toBe("remux");
    const gif = clampVideoConvertSettings({ ...defaultVideoConvertSettings, container: "gif", mode: "remux" });
    expect(gif.mode).toBe("transcode");
  });
});
