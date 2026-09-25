/**
 * Public facts for the QV1 Evaluation installer.
 * Pages read this object. Do not hard-code version, hash, or OS lines in the UI.
 *
 * The zip lives in a private R2 bucket. /qv1/download issues a short-lived
 * presigned URL for a signed-in user. It does not use a public download domain.
 */
export type Qv1DownloadNotice = "ready" | "soon" | "limited" | "unavailable" | "paused";

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
  fileName: "QV1-Setup-Evaluation.zip",
  fileSizeBytes: 4_313_243_347,
  sha256: "25E20EEA0E5303DAC9F9749086B45ECFC6CA7310E1E9360E7B273AB07B649E51",
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

/** "v1.2.0 · 4.02 GB · Windows 10/11 x64", skipping a missing size. */
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
