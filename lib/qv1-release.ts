/**
 * Public facts for the QV1 Evaluation installer.
 * Pages and the download route read this object. Do not hard-code version,
 * hash, or OS lines in the UI.
 *
 * fileSizeBytes and sha256 stay empty until the published GitHub Release
 * asset is known. Empty values are omitted from the page.
 */
export type Qv1Release = {
  version: string;
  fileName: string;
  fileSizeBytes: number | null;
  sha256: string;
  releaseNotesUrl: string;
  minOs: string;
  codeSigned: boolean;
  /** ISO date (YYYY-MM-DD). */
  releaseDate: string;
};

export const qv1Release: Qv1Release = {
  version: "1.2.0",
  fileName: "QV1-Evaluation-1.2.0-win-x64.exe",
  fileSizeBytes: null,
  sha256: "",
  releaseNotesUrl: "/qv1#release-notes",
  minOs: "Windows 10/11 x64",
  codeSigned: false,
  releaseDate: "2026-09-24",
};

export function qv1HasFileSize(release: Pick<Qv1Release, "fileSizeBytes">): boolean {
  return typeof release.fileSizeBytes === "number" && Number.isFinite(release.fileSizeBytes) && release.fileSizeBytes >= 0;
}

export function qv1HasSha256(release: Pick<Qv1Release, "sha256">): boolean {
  return release.sha256.trim().length > 0;
}

/** "v1.2.0 · 86.4 MB · Windows 10/11 x64", skipping a missing size. */
export function qv1DownloadSummary(
  release: Pick<Qv1Release, "version" | "fileSizeBytes" | "minOs">,
  formatSize: (bytes: number) => string,
): string {
  const parts = [`v${release.version}`];
  if (qv1HasFileSize(release) && release.fileSizeBytes != null) {
    parts.push(formatSize(release.fileSizeBytes));
  }
  const os = release.minOs.trim();
  if (os) parts.push(os);
  return parts.join(" · ");
}
