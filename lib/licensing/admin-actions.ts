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