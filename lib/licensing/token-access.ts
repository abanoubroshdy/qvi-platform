import type { SupabaseClient } from "@supabase/supabase-js";
import { deviceFingerprintsMatch, verifyLicenseToken } from "@/lib/licensing/jwt";
import { entitlementsForProduct, isProductCode, type ProductCode } from "@/lib/licensing/products";
import type { LicenseRow, LicenseStatus } from "@/lib/licensing/types";

function effectiveLicenseStatus(row: LicenseRow): LicenseStatus {
  if (row.status === "revoked") return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return row.status === "expired" ? "expired" : "active";
}

export type VerifiedLicenseContext = {
  license: LicenseRow;
  productCode: ProductCode;
  entitlements: string[];
  deviceFingerprint: string;
};

export async function resolveVerifiedLicenseBearer(
  client: SupabaseClient,
  token: string,
  expectedProductCode: ProductCode,
  expectedDeviceFingerprint?: string,
): Promise<VerifiedLicenseContext | null> {
  const verified = verifyLicenseToken(token);
  if (!verified.ok) return null;

  const { payload } = verified;
  if (!payload.sub || !payload.product || !isProductCode(payload.product)) return null;
  if (payload.product !== expectedProductCode) return null;

  if (expectedDeviceFingerprint !== undefined) {
    if (!deviceFingerprintsMatch(payload.device ?? "", expectedDeviceFingerprint)) return null;
  }

  const { data: license } = await client.from("licenses").select("*").eq("id", payload.sub).maybeSingle();
  if (!license) return null;

  const { data: product } = await client
    .from("license_products")
    .select("code")
    .eq("id", license.product_id)
    .maybeSingle();

  if (!product?.code || product.code !== expectedProductCode) return null;

  const status = effectiveLicenseStatus(license as LicenseRow);
  if (status !== "active") return null;

  const fingerprint = payload.device!.trim();
  const { data: device } = await client
    .from("license_devices")
    .select("id")
    .eq("license_id", license.id)
    .eq("device_fingerprint_hash", fingerprint)
    .is("revoked_at", null)
    .maybeSingle();
  if (!device) return null;

  const entitlements = Array.isArray(payload.entitlements)
    ? payload.entitlements.filter((value): value is string => typeof value === "string")
  : entitlementsForProduct(expectedProductCode);

  return {
    license: license as LicenseRow,
    productCode: expectedProductCode,
    entitlements,
    deviceFingerprint: fingerprint,
  };
}

export function licenseHasCloudUpdates(entitlements: string[]): boolean {
  return entitlements.some((feature) => feature.toLowerCase() === "cloudupdates");
}