/** Strip server-only fields before sending release rows to the browser. */
export type SanitizedReleaseRow = {
  id: string;
  product_code: string;
  version: string;
  channel: string;
  sha256: string;
  release_notes: string | null;
  is_published: boolean;
  created_at?: string;
  min_license?: string | null;
  fileSize?: number;
  mandatory: boolean;
  minOsVersion?: string;
};

type ReleaseDbRow = {
  id: string;
  product_code: string;
  version: string;
  channel: string;
  storage_path?: string;
  sha256: string;
  release_notes: string | null;
  is_published: boolean;
  created_at?: string;
  min_license?: string | null;
  file_size?: number | null;
  mandatory?: boolean;
  min_os_version?: string | null;
};

export function sanitizeReleaseRow(row: ReleaseDbRow): SanitizedReleaseRow {
  const { storage_path, file_size, min_os_version, mandatory, ...rest } = row;
  void storage_path;
  return {
    ...rest,
    fileSize: file_size ?? undefined,
    mandatory: mandatory ?? false,
    minOsVersion: min_os_version ?? undefined,
  };
}

export function sanitizeReleaseRows(rows: ReleaseDbRow[]): SanitizedReleaseRow[] {
  return rows.map(sanitizeReleaseRow);
}