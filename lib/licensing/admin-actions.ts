import type { SupabaseClient } from "@supabase/supabase-js";
import { generateLicenseKey, hashLicenseKey, licenseKeyHint } from "@/lib/licensing/license-key";
import { isProductCode } from "@/lib/licensing/products";

export async function findUserIdByEmail(client: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function createLicenseForUser(
  client: SupabaseClient,
  input: {
    userId: string;
    productCode: string;
    expiresAt: string | null;
    maxDevices: number;
  },
): Promise<{ ok: true; licenseKey: string; licenseId: string } | { ok: false; error: string }> {
  if (!isProductCode(input.productCode)) return { ok: false, error: "Unknown product." };

  const { data: product } = await client
    .from("license_products")
    .select("id")
    .eq("code", input.productCode)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };

  const licenseKey = generateLicenseKey();
  const licenseKeyHash = await hashLicenseKey(licenseKey);

  const { data: license, error } = await client
    .from("licenses")
    .insert({
      user_id: input.userId,
      product_id: product.id,
      license_key_hash: licenseKeyHash,
      license_key_hint: licenseKeyHint(licenseKey),
      status: "active",
      max_devices: input.maxDevices,
      expires_at: input.expiresAt,
    })
    .select("id")
    .single();

  if (error || !license) return { ok: false, error: error?.message ?? "Could not create license." };

  await client.from("license_events").insert({
    license_id: license.id,
    user_id: input.userId,
    product_id: product.id,
    event_type: "license_created",
    success: true,
    metadata: { productCode: input.productCode },
  });

  return { ok: true, licenseKey, licenseId: license.id };
}

export async function regenerateLicenseKey(
  client: SupabaseClient,
  input: {
    licenseId: string;
    actorUserId?: string | null;
    actorEmail?: string | null;
    source: "admin" | "owner";
  },
): Promise<{ ok: true; licenseKey: string } | { ok: false; error: string }> {
  const { data: license, error: fetchError } = await client
    .from("licenses")
    .select("id, user_id, product_id, status")
    .eq("id", input.licenseId)
    .maybeSingle();

  if (fetchError || !license) return { ok: false, error: "License not found." };
  if (license.status !== "active") return { ok: false, error: "Only active licenses can get a new key." };

  const licenseKey = generateLicenseKey();
  const licenseKeyHash = await hashLicenseKey(licenseKey);

  const { error: updateError } = await client
    .from("licenses")
    .update({
      license_key_hash: licenseKeyHash,
      license_key_hint: licenseKeyHint(licenseKey),
    })
    .eq("id", license.id)
    .eq("status", "active");

  if (updateError) return { ok: false, error: updateError.message };

  await client.from("license_events").insert({
    license_id: license.id,
    user_id: license.user_id,
    product_id: license.product_id,
    event_type: "license_key_regenerated",
    success: true,
    metadata: { source: input.source },
  });

  if (input.source === "admin" && (input.actorUserId || input.actorEmail)) {
    const { data: userRow } = license.user_id
      ? await client.auth.admin.getUserById(license.user_id)
      : { data: { user: null } };
    await client.from("admin_audit_log").insert({
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      action: "license_key_regenerate",
      target_user_id: license.user_id,
      target_email: userRow.user?.email ?? null,
      metadata: { licenseId: license.id, productId: license.product_id },
    });
  }

  return { ok: true, licenseKey };
}

const OWNER_REGENERATE_MAX_PER_HOUR = 3;

export async function countRecentOwnerRegenerations(
  client: SupabaseClient,
  licenseId: string,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .from("license_events")
    .select("id", { count: "exact", head: true })
    .eq("license_id", licenseId)
    .eq("user_id", userId)
    .eq("event_type", "license_key_regenerated")
    .gte("created_at", since);
  if (error) return OWNER_REGENERATE_MAX_PER_HOUR;
  return count ?? 0;
}

export function ownerRegenerateRateLimited(recentCount: number): boolean {
  return recentCount >= OWNER_REGENERATE_MAX_PER_HOUR;
}