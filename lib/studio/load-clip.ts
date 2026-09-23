/**
 * Decode an audio file into the session clip shape.
 * The caller adds it to a project with `addImportedFileAsTrack`.
 */

import { inspectAudioBuffer } from "@/lib/audio-inspect";
import { studioPeakBarCount, studioPeaksFromBuffer } from "@/lib/studio/peaks";
import { isStudioImportFileName, largeFileWarning, type StudioFileWarning, type StudioImportedFile } from "@/lib/studio/project";

export type StudioDecodeResult =
  | { ok: true; file: StudioImportedFile; warning: StudioFileWarning | null }
  | { ok: false; reason: "unsupported-file" | "decode-failed" };

export async function loadStudioFile(
  file: File,
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>,
  options?: { peakBars?: number },
): Promise<StudioDecodeResult> {
  if (!isStudioImportFileName(file.name)) return { ok: false, reason: "unsupported-file" };
  try {
    const buffer = await decodeAudioData(await file.arrayBuffer());
    const info = inspectAudioBuffer(file, buffer);
    return {
      ok: true,
      warning: largeFileWarning(file.size),
      file: {
        fileName: file.name,
        byteLength: file.size,
        sourceDurationSec: info.duration,
        sampleRate: info.sampleRate,
        channels: info.channels,
        peaks: studioPeaksFromBuffer(buffer, options?.peakBars ?? studioPeakBarCount("desktop")),
        buffer,
      },
    };
  } catch {
    return { ok: false, reason: "decode-failed" };
  }
}
