import type { SupabaseClient } from "@supabase/supabase-js";
import { isProductCode, PRODUCT_CODES, type ProductCode } from "@/lib/licensing/products";
import { isNewerVersion } from "@/lib/licensing/version";
import type { UpdateCheckResponse } from "@/lib/licensing/types";
import { resolveSiteUrl } from "@/lib/supabase/config";

export type UpdateChannel = "evaluation" | "stable" | "beta";

export function parseUpdateChannel(value: string | null | undefined): UpdateChannel | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "evaluation" || trimmed === "stable" || trimmed === "beta") {
    return trimmed;
  }
  return null;
}

export function defaultUpdateChannel(productCode: ProductCode): UpdateChannel {
  return productCode === PRODUCT_CODES.qv1Eval ? "evaluation" : "stable";
}

export function paidUpdateChannelRequiresBearer(productCode: ProductCode, channel: UpdateChannel): boolean {
  return productCode !== PRODUCT_CODES.qv1Eval && channel !== "evaluation";
}

function releaseMetadataFields(release: {
  file_size?: number | null;
  mandatory?: boolean;
  min_os_version?: string | null;
}) {
  return {
    fileSize: release.file_size ?? undefined,
    mandatory: release.mandatory ?? false,
    minOsVersion: release.min_os_version ?? undefined,
  };
}

export async function checkProductUpdate(
  client: SupabaseClient,
  input: {
    productCode: string;
    currentVersion: string;
    channel?: UpdateChannel;
    allowPaidChannel: boolean;
  },
  siteUrl?: string,
): Promise<UpdateCheckResponse> {
  if (!isProductCode(input.productCode)) {
    return { updateAvailable: false, error: "Unknown product." };
  }

  const channel = input.channel ?? defaultUpdateChannel(input.productCode);

  if (!input.allowPaidChannel && channel !== "evaluation") {
    return { updateAvailable: false, error: "Updates are not available for this license state." };
  }

  const { data: releases } = await client
    .from("license_releases")
    .select("*")
    .eq("product_code", input.productCode)
    .eq("channel", channel)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = releases?.[0];
  if (!latest) {
    return { updateAvailable: false, channel };
  }

  const meta = releaseMetadataFields(latest);
  const updateAvailable = isNewerVersion(latest.version, input.currentVersion);
  if (!updateAvailable) {
    return {
      updateAvailable: false,
      latestVersion: latest.version,
      channel,
      ...meta,
    };
  }

  const base = (siteUrl ?? resolveSiteUrl()).replace(/\/$/, "");
  const downloadUrl = `${base}/api/downloads/artifact?product=${encodeURIComponent(input.productCode)}&channel=${encodeURIComponent(channel)}&version=${encodeURIComponent(latest.version)}`;

  return {
    updateAvailable: true,
    latestVersion: latest.version,
    releaseNotes: latest.release_notes ?? undefined,
    sha256: latest.sha256,
    downloadUrl,
    channel,
    ...meta,
  };
}