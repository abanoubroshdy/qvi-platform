import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const { data: device } = await client
    .from("license_devices")
    .select("id, license_id")
    .eq("id", id)
    .maybeSingle();
  if (!device) return jsonResponse({ error: "Device not found" }, 404);

  await client.from("license_devices").update({ revoked_at: new Date().toISOString() }).eq("id", id);

  await client.from("license_events").insert({
    license_id: device.license_id,
    event_type: "device_revoked_admin",
    success: true,
    metadata: { deviceId: id, admin: guard.email },
  });

  return jsonResponse({ ok: true });
}