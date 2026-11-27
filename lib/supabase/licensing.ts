import type { SupabaseClient } from "@supabase/supabase-js";

export type UserLicenseSummary = {
  id: string;
  status: string;
  max_devices: number;
  license_key_hint: string;
  starts_at: string;
  expires_at: string | null;
  is_trial: boolean;
  product: {
    code: string;
    name: string;
    is_free: boolean;
  };
  devices: UserLicenseDevice[];
};

export type UserLicenseDevice = {
  id: string;
  device_name: string | null;
  device_fingerprint_hash: string;
  activated_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

export async function fetchUserLicenses(
  client: SupabaseClient,
  userId: string,
): Promise<{ rows: UserLicenseSummary[]; error: string | null }> {
  const { data: licenses, error } = await client
    .from("licenses")
    .select(
      "id, status, max_devices, license_key_hint, starts_at, expires_at, is_trial, product_id, license_products(code, name, is_free)",
    )
    .eq("user_id", userId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows: UserLicenseSummary[] = [];
  const licenseRows = licenses ?? [];
  for (let index = 0; index < licenseRows.length; index += 1) {
    const row = licenseRows[index]!;
    const joined = row.license_products as
      | { code: string; name: string; is_free: boolean }
      | { code: string; name: string; is_free: boolean }[]
      | null;
    const product = Array.isArray(joined) ? joined[0] : joined;
    if (!product) continue;

    const { data: devices } = await client
      .from("license_devices")
      .select("id, device_name, device_fingerprint_hash, activated_at, last_seen_at, revoked_at")
      .eq("license_id", row.id)
      .order("activated_at", { ascending: false });

    rows.push({
      id: row.id,
      status: row.status,
      max_devices: row.max_devices,
      license_key_hint: row.license_key_hint,
      starts_at: row.starts_at,
      expires_at: row.expires_at,
      is_trial: Boolean((row as { is_trial?: boolean }).is_trial),
      product,
      devices: (devices ?? []) as UserLicenseDevice[],
    });
  }

  return { rows, error: null };
}

export async function revokeOwnDevice(
  client: SupabaseClient,
  deviceId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc("revoke_own_license_device", { p_device_id: deviceId });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data), error: data ? null : "Device not found." };
}