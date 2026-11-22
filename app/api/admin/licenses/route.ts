import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { createLicenseForUser, findUserIdByEmail } from "@/lib/licensing/admin-actions";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { formatLicenseKey, hashLicenseKey } from "@/lib/licensing/license-key";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim();
  const key = url.searchParams.get("key")?.trim();

  let query = client
    .from("licenses")
    .select(
      "id, user_id, status, max_devices, license_key_hint, starts_at, expires_at, created_at, license_products(code, name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (key) {
    const hash = await hashLicenseKey(key);
    query = query.eq("license_key_hash", hash);
  } else if (email) {
    const userId = await findUserIdByEmail(client, email);
    if (!userId) return jsonResponse({ licenses: [] });
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  const licenses = await Promise.all(
    (data ?? []).map(async (row) => {
      const { count } = await client
        .from("license_devices")
        .select("id", { count: "exact", head: true })
        .eq("license_id", row.id)
        .is("revoked_at", null);
      const { data: userData } = await client.auth.admin.getUserById(row.user_id);
      return {
        ...row,
        userEmail: userData.user?.email ?? null,
        activeDevices: count ?? 0,
      };
    }),
  );

  return jsonResponse({ licenses });
}

export async function POST(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  let body: {
    email?: string;
    productCode?: string;
    expiresAt?: string | null;
    maxDevices?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const email = body.email?.trim();
  const productCode = body.productCode?.trim();
  if (!email || !productCode) return jsonResponse({ error: "email and productCode are required." }, 400);

  const userId = await findUserIdByEmail(client, email);
  if (!userId) return jsonResponse({ error: "No user found for that email." }, 404);

  const maxDevices = Number.isFinite(body.maxDevices) ? Math.max(1, body.maxDevices!) : 2;
  const created = await createLicenseForUser(client, {
    userId,
    productCode,
    expiresAt: body.expiresAt ?? null,
    maxDevices,
  });

  if (!created.ok) return jsonResponse({ error: created.error }, 400);

  return jsonResponse({
    licenseId: created.licenseId,
    licenseKey: created.licenseKey,
    licenseKeyFormatted: formatLicenseKey(created.licenseKey),
  });
}