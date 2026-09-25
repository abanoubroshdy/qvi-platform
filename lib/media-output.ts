/** Shared download-name and zip helpers for batch converters. */

export function fileStem(filename: string, fallback = "file"): string {
  const stem = filename.replace(/\.[^.]+$/, "").trim();
  return stem || fallback;
}

export function outputFileName(filename: string, extension: string, fallback = "file"): string {
  return `${fileStem(filename, fallback)}.${extension}`;
}

/** Avoid collisions when several sources share the same stem. */
export function uniqueOutputName(
  filename: string,
  extension: string,
  used: Set<string>,
  fallback = "file",
): string {
  const preferred = outputFileName(filename, extension, fallback);
  const key = preferred.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return preferred;
  }
  const stem = fileStem(filename, fallback);
  let index = 2;
  while (used.has(`${stem}-${index}.${extension}`.toLowerCase())) {
    index += 1;
  }
  const next = `${stem}-${index}.${extension}`;
  used.add(next.toLowerCase());
  return next;
}

export type NamedBlob = {
  name: string;
  blob: Blob;
};

export async function zipNamedBlobs(entries: NamedBlob[]): Promise<Blob> {
  if (!entries.length) throw new Error("No files to zip");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();
  for (const entry of entries) {
    zip.file(uniqueZipEntryName(entry.name, used), entry.blob);
  }
  return zip.generateAsync({ type: "blob" });
}

function uniqueZipEntryName(name: string, used: Set<string>): string {
  const trimmed = name.trim() || "file.bin";
  const key = trimmed.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return trimmed;
  }
  const dot = trimmed.lastIndexOf(".");
  const stem = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const ext = dot > 0 ? trimmed.slice(dot) : "";
  let index = 2;
  while (used.has(`${stem}-${index}${ext}`.toLowerCase())) index += 1;
  const next = `${stem}-${index}${ext}`;
  used.add(next.toLowerCase());
  return next;
}
