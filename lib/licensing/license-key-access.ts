import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptLicenseKeyPayload, encryptLicenseKeyPlaintext } from "@/lib/licensing/license-key-crypto";
import { formatLicenseKey } from "@/lib/licensing/license-key";

export const LICENSE_KEY_REVEAL_MAX_PER_HOUR = 15;
export const LICENSE_KEY_EMAIL_MAX_PER_HOUR = 5;

export async function countRecentLicenseEvents(
  client: SupabaseClient,
  licenseId: string,
  eventType: string,
  sinceMs = 60 * 60 * 1000,
): Promise<number> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { count, error } = await client
    .from("license_events")
    .select("id", { count: "exact", head: true })
    .eq("license_id", licenseId)
    .eq("event_type", eventType)
    .gte("created_at", since);
  if (error) return LICENSE_KEY_REVEAL_MAX_PER_HOUR;
  return count ?? 0;
}

export function isRevealRateLimited(count: number): boolean {
  return count >= LICENSE_KEY_REVEAL_MAX_PER_HOUR;
}

export function isEmailRateLimited(count: number): boolean {
  return count >= LICENSE_KEY_EMAIL_MAX_PER_HOUR;
}

export async function loadActiveLicenseRow(client: SupabaseClient, licenseId: string) {
  const { data, error } = await client
    .from("licenses")
    .select("id, user_id, status, license_key_encrypted, license_products(name)")
    .eq("id", licenseId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function revealStoredLicenseKey(
  client: SupabaseClient,
  licenseId: string,
): Promise<
  | { ok: true; licenseKeyFormatted: string }
  | { ok: false; reason: "not_found" | "inactive" | "legacy" | "not_configured" | "decrypt_failed" }
> {
  const row = await loadActiveLicenseRow(client, licenseId);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "active") return { ok: false, reason: "inactive" };
  if (!row.license_key_encrypted) return { ok: false, reason: "legacy" };

  const decrypted = await decryptLicenseKeyPayload(row.license_key_encrypted);
  if (!decrypted) {
    return { ok: false, reason: process.env.LICENSE_KEY_ENCRYPTION_KEY ? "decrypt_failed" : "not_configured" };
  }
  return { ok: true, licenseKeyFormatted: formatLicenseKey(decrypted) };
}

export async function licenseKeyEncryptedColumn(licenseKey: string): Promise<string | null> {
  return encryptLicenseKeyPlaintext(licenseKey);
}

export async function logLicenseKeyEvent(
  client: SupabaseClient,
  input: { licenseId: string; userId: string | null; productId: string; eventType: string; metadata?: Record<string, unknown> },
) {
  await client.from("license_events").insert({
    license_id: input.licenseId,
    user_id: input.userId,
    product_id: input.productId,
    event_type: input.eventType,
    success: true,
    metadata: input.metadata ?? {},
  });
}