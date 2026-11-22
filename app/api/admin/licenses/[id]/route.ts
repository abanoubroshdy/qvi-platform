import { jsonResponse } from "@/lib/licensing/http";
import { requireLicenseAdmin } from "@/lib/licensing/admin-guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireLicenseAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const { data: license, error } = await client
    .from("licenses")
    .update({ status: "revoked" })
    .eq("id", id)
    .select("id, user_id, product_id")
    .maybeSingle();

  if (error || !license) return jsonResponse({ error: "License not found." }, 404);

  await client.from("license_events").insert({
    license_id: license.id,
    user_id: license.user_id,
    product_id: license.product_id,
    event_type: "license_revoked",
    success: true,
    metadata: { revokedBy: guard.email },
  });

  return jsonResponse({ ok: true });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireLicenseAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const { data: license } = await client
    .from("licenses")
    .select("*, license_products(code, name)")
    .eq("id", id)
    .maybeSingle();
  if (!license) return jsonResponse({ error: "Not found" }, 404);

  const { data: devices } = await client
    .from("license_devices")
    .select("*")
    .eq("license_id", id)
    .order("activated_at", { ascending: false });

  const { data: events } = await client
    .from("license_events")
    .select("*")
    .eq("license_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return jsonResponse({ license, devices: devices ?? [], events: events ?? [] });
}