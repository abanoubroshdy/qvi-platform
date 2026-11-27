import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import type { PublicReleaseMetadata } from "@/lib/licensing/types";

const PUBLIC_RELEASE_COLUMNS =
  "product_code, version, channel, sha256, release_notes, file_size, mandatory, min_os_version";

type PublicReleaseRow = {
  product_code: string;
  version: string;
  channel: "stable" | "beta" | "evaluation";
  sha256: string;
  release_notes: string | null;
  file_size: number | null;
  mandatory: boolean;
  min_os_version: string | null;
};

function mapPublicReleaseRow(row: PublicReleaseRow): PublicReleaseMetadata {
  return {
    productCode: row.product_code,
    version: row.version,
    channel: row.channel,
    sha256: row.sha256,
    releaseNotes: row.release_notes,
    fileSize: row.file_size ?? undefined,
    mandatory: row.mandatory,
    minOsVersion: row.min_os_version ?? undefined,
  };
}

async function fetchLatestPublished(
  client: SupabaseClient,
  productCode: string,
  channel: "stable" | "beta" | "evaluation",
): Promise<PublicReleaseMetadata | null> {
  const { data } = await client
    .from("license_releases")
    .select(PUBLIC_RELEASE_COLUMNS)
    .eq("product_code", productCode)
    .eq("channel", channel)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return mapPublicReleaseRow(data as PublicReleaseRow);
}

/** Latest published Neyora build: stable first, then beta. Never exposes storage paths. */
export async function fetchLatestPublicNeyoraRelease(
  client: SupabaseClient,
): Promise<PublicReleaseMetadata | null> {
  for (const channel of ["stable", "beta"] as const) {
    const release = await fetchLatestPublished(client, PRODUCT_CODES.neyoraPro, channel);
    if (release) return release;
  }
  return null;
}

export function formatReleaseFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}