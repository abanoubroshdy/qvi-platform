/** Installer redirect. The real file URL lives only in QV1_DOWNLOAD_URL. */

export const QV1_DOWNLOAD_PATH = "/qv1/download";
export const QV1_DOWNLOAD_SOON_PATH = "/qv1?download=soon";

export type Qv1DownloadRedirect = {
  location: string;
  /** Temporary. The GitHub Release asset URL can change without a new site build. */
  status: 307;
};

/**
 * Non-empty QV1_DOWNLOAD_URL redirects to that URL.
 * Unset or blank sends the visitor back to the evaluation page in the calm
 * "download coming soon" state. This function does not invent a file URL.
 */
export function resolveQv1DownloadRedirect(envUrl: string | undefined | null): Qv1DownloadRedirect {
  const url = typeof envUrl === "string" ? envUrl.trim() : "";
  if (!url) {
    return { location: QV1_DOWNLOAD_SOON_PATH, status: 307 };
  }
  return { location: url, status: 307 };
}
