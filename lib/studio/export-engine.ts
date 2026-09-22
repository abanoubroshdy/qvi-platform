/**
 * Bounce the audible QVI Studio mix with ffmpeg.wasm.
 * Tempo and pitch use the audio-tempo filters. Playback rate is not used.
 */

import { runFFmpegFiles, type FFmpegInputFile } from "@/lib/ffmpeg";
import { planStudioExport } from "@/lib/studio/export-plan";
import type { StudioExportEngine, StudioEngineExportResult } from "@/lib/studio/engine";
import type { StudioClip, StudioProject } from "@/lib/studio/types";
import { encodeWavPcm16, wavArrayBuffer } from "@/lib/studio/wav";

export class StudioExportError extends Error {
  readonly code: "missing-buffer";

  constructor() {
    super("A clip is missing decoded audio.");
    this.name = "StudioExportError";
    this.code = "missing-buffer";
  }
}

export function createStudioExportEngine(deps?: {
  run?: typeof runFFmpegFiles;
  encodeClip?: (buffer: AudioBuffer, name: string) => File;
  onProgress?: (ratio: number) => void;
}): StudioExportEngine {
  const run = deps?.run ?? runFFmpegFiles;
  const encodeClip = deps?.encodeClip ?? encodeClipWav;

  return {
    async exportMix(request): Promise<StudioEngineExportResult> {
      const plan = planStudioExport(request.project, request.format, request.settings);
      if (!plan.ok) {
        if (plan.reason === "missing-buffer") throw new StudioExportError();
        return { ok: false, reason: plan.reason };
      }
      const files = plan.inputs.map((input) => {
        const clip = findClip(request.project, input.clipId);
        if (!clip?.buffer) throw new StudioExportError();
        return { name: input.name, file: encodeClip(clip.buffer, input.name) } satisfies FFmpegInputFile;
      });
      const blob = await run({
        files,
        outputName: plan.outputName,
        mimeType: plan.mimeType,
        args: plan.args,
        fallbackArgs: plan.fallbackArgs,
        onProgress: deps?.onProgress,
      });
      return { ok: true, blob, fileName: plan.fileName, mimeType: plan.mimeType };
    },
  };
}

function encodeClipWav(buffer: AudioBuffer, name: string): File {
  return new File([wavArrayBuffer(encodeWavPcm16(buffer))], name, { type: "audio/wav" });
}

function findClip(project: StudioProject, clipId: string): StudioClip | null {
  for (const track of project.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) return clip;
  }
  return null;
}
