import { jsonResponse } from "@/lib/licensing/http";
import { requireLicenseAdmin } from "@/lib/licensing/admin-guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireLicenseAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const failedOnly = url.searchParams.get("failed") === "1";

  let query = client
    .from("license_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (failedOnly) query = query.eq("success", false);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ events: data ?? [] });
}