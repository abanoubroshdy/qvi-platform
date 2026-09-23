import type { AudioExportFormat } from "@/lib/audio-export";

/** Accept list for browser file pickers (decode-side formats). */
export const convertibleAudioAccept =
  "audio/mpeg,audio/mp4,audio/wav,audio/wave,audio/x-wav,audio/ogg,audio/flac,audio/aac,audio/x-m4a,audio/opus,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.opus";

const convertibleExtension =
  /\.(mp3|wav|wave|m4a|aac|ogg|oga|flac|opus)$/i;

export function isConvertibleAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || convertibleExtension.test(file.name);
}

export function audioFileStem(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").trim();
  return stem || "audio";
}

export function convertedOutputName(filename: string, format: AudioExportFormat): string {
  return `${audioFileStem(filename)}.${format}`;
}

/** Avoid collisions when several sources share the same stem. */
export function uniqueConvertedName(
  filename: string,
  format: AudioExportFormat,
  used: Set<string>,
): string {
  const preferred = convertedOutputName(filename, format);
  const key = preferred.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return preferred;
  }
  const stem = audioFileStem(filename);
  let index = 2;
  while (used.has(`${stem}-${index}.${format}`.toLowerCase())) {
    index += 1;
  }
  const next = `${stem}-${index}.${format}`;
  used.add(next.toLowerCase());
  return next;
}

export function batchConvertProgress(completed: number, total: number, currentRatio: number): number {
  if (total <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, currentRatio));
  return Math.min(1, (completed + clamped) / total);
}

export type ZipAudioEntry = {
  name: string;
  blob: Blob;
};

export async function zipAudioBlobs(entries: ZipAudioEntry[]): Promise<Blob> {
  if (!entries.length) {
    throw new Error("No files to zip");
  }
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();
  for (const entry of entries) {
    const name = uniqueZipEntryName(entry.name, used);
    zip.file(name, entry.blob);
  }
  return zip.generateAsync({ type: "blob" });
}

function uniqueZipEntryName(name: string, used: Set<string>): string {
  const trimmed = name.trim() || "audio.bin";
  const key = trimmed.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return trimmed;
  }
  const dot = trimmed.lastIndexOf(".");
  const stem = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const ext = dot > 0 ? trimmed.slice(dot) : "";
  let index = 2;
  while (used.has(`${stem}-${index}${ext}`.toLowerCase())) {
    index += 1;
  }
  const next = `${stem}-${index}${ext}`;
  used.add(next.toLowerCase());
  return next;
}
